-- Migration: 011_fix_rpc_sell_shares
-- Descricao: Corrige rpc_sell_shares para usar Constant Product AMM
-- Data: 2025-12-10
-- Issue: Estava usando formula linear (shares * preco) em vez de Constant Product

-- Problema original:
--   v_amount_out := p_shares * v_price_before;  -- Formula LINEAR
--   v_new_pool_yes := v_pool_yes - v_amount_out; -- Remove do MESMO pool
--
-- Correcao (Constant Product):
--   Vender SIM:
--     new_pool_no = pool_no + shares      -- Adiciona ao pool OPOSTO
--     new_pool_yes = k / new_pool_no      -- Recalcula mantendo k
--     amount_out = pool_yes - new_pool_yes -- BRL recebido
--
--   Vender NAO:
--     new_pool_yes = pool_yes + shares
--     new_pool_no = k / new_pool_yes
--     amount_out = pool_no - new_pool_no
--
-- IMPORTANTE: Esta correcao alinha o servidor com o cliente (cpmm.ts)

DROP FUNCTION IF EXISTS rpc_sell_shares(uuid, boolean, numeric);

CREATE OR REPLACE FUNCTION rpc_sell_shares(
  p_market_id UUID,
  p_outcome BOOLEAN,
  p_shares NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_current_shares NUMERIC;
  v_pool_yes NUMERIC;
  v_pool_no NUMERIC;
  v_k NUMERIC;
  v_new_pool_yes NUMERIC;
  v_new_pool_no NUMERIC;
  v_amount_out NUMERIC;
  v_market_outcome BOOLEAN;
  v_ends_at TIMESTAMPTZ;
  v_new_balance NUMERIC;
  v_price_before NUMERIC;
  v_price_after NUMERIC;
  v_position_id UUID;
BEGIN
  -- Obter usuario autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  -- Validacoes
  IF p_shares <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser positiva';
  END IF;

  -- Verificar posicao do usuario
  IF p_outcome THEN
    SELECT id, shares_yes INTO v_position_id, v_current_shares
    FROM market_positions
    WHERE user_id = v_user_id AND market_id = p_market_id;
  ELSE
    SELECT id, shares_no INTO v_position_id, v_current_shares
    FROM market_positions
    WHERE user_id = v_user_id AND market_id = p_market_id;
  END IF;

  IF v_current_shares IS NULL OR v_current_shares < p_shares THEN
    RAISE EXCEPTION 'Acoes insuficientes. Disponivel: %', COALESCE(v_current_shares, 0);
  END IF;

  -- Bloquear mercado
  SELECT pool_yes, pool_no, outcome, ends_at
  INTO v_pool_yes, v_pool_no, v_market_outcome, v_ends_at
  FROM markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mercado nao encontrado';
  END IF;

  IF v_market_outcome IS NOT NULL THEN
    RAISE EXCEPTION 'Mercado ja foi resolvido';
  END IF;

  IF v_ends_at < NOW() THEN
    RAISE EXCEPTION 'Mercado ja encerrou';
  END IF;

  -- Calcular constante k (Constant Product)
  v_k := v_pool_yes * v_pool_no;

  -- =====================================================
  -- CONSTANT PRODUCT AMM - CORRIGIDO
  -- Vender = adicionar shares ao pool OPOSTO
  -- Manter k = pool_yes * pool_no constante
  -- =====================================================

  IF p_outcome THEN
    -- Vendendo SIM: adiciona shares ao pool_no
    v_price_before := v_pool_yes / (v_pool_yes + v_pool_no);

    v_new_pool_no := v_pool_no + p_shares;
    v_new_pool_yes := v_k / v_new_pool_no;
    v_amount_out := v_pool_yes - v_new_pool_yes;

    v_price_after := v_new_pool_yes / (v_new_pool_yes + v_new_pool_no);
  ELSE
    -- Vendendo NAO: adiciona shares ao pool_yes
    v_price_before := v_pool_no / (v_pool_yes + v_pool_no);

    v_new_pool_yes := v_pool_yes + p_shares;
    v_new_pool_no := v_k / v_new_pool_yes;
    v_amount_out := v_pool_no - v_new_pool_no;

    v_price_after := v_new_pool_no / (v_new_pool_yes + v_new_pool_no);
  END IF;

  -- Validar que amount_out e positivo
  IF v_amount_out <= 0 THEN
    RAISE EXCEPTION 'Erro no calculo: valor recebido invalido';
  END IF;

  -- Atualizar pools
  UPDATE markets
  SET pool_yes = v_new_pool_yes,
      pool_no = v_new_pool_no
  WHERE id = p_market_id;

  -- Creditar no ledger
  INSERT INTO ledger_entries (user_id, amount, category, reference_id, description)
  VALUES (
    v_user_id,
    v_amount_out,
    'TRADE',
    p_market_id,
    'Venda de ' || ROUND(p_shares, 2) || ' acoes ' || CASE WHEN p_outcome THEN 'SIM' ELSE 'NAO' END
  );

  -- Atualizar posicao
  IF p_outcome THEN
    UPDATE market_positions
    SET shares_yes = shares_yes - p_shares,
        updated_at = NOW()
    WHERE user_id = v_user_id AND market_id = p_market_id;
  ELSE
    UPDATE market_positions
    SET shares_no = shares_no - p_shares,
        updated_at = NOW()
    WHERE user_id = v_user_id AND market_id = p_market_id;
  END IF;

  -- Obter novo saldo
  SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
  FROM ledger_entries
  WHERE user_id = v_user_id;

  -- Audit log
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, metadata)
  VALUES (
    v_user_id,
    'SELL_SHARES',
    'market_positions',
    v_position_id,
    jsonb_build_object('pool_yes', v_pool_yes, 'pool_no', v_pool_no),
    jsonb_build_object('pool_yes', v_new_pool_yes, 'pool_no', v_new_pool_no),
    jsonb_build_object(
      'market_id', p_market_id,
      'outcome', p_outcome,
      'shares_sold', p_shares,
      'price_before', v_price_before,
      'price_after', v_price_after,
      'amount_received', v_amount_out,
      'source', 'rpc_sell_shares'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'shares_sold', ROUND(p_shares, 4),
    'amount_received', ROUND(v_amount_out, 2),
    'new_balance', ROUND(v_new_balance, 2),
    'price_before', ROUND(v_price_before * 100, 0),
    'price_after', ROUND(v_price_after * 100, 0)
  );
END;
$$;

COMMENT ON FUNCTION rpc_sell_shares IS 'Vende shares usando Constant Product AMM. Adiciona shares ao pool oposto mantendo k constante (corrigido em migration 011).';
