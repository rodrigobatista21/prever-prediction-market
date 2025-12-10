-- Migration: 010_fix_rpc_price_display
-- Descricao: Corrige price display invertido em rpc_buy_shares
-- Data: 2025-12-10
-- Issue: v_price_before e v_price_after mostravam preco do lado OPOSTO

-- Problema original:
--   p_outcome = TRUE (comprando SIM):
--     v_price_before = pool_NO / total   (ERRADO - mostra preco do NAO)
--     v_price_after  = new_pool_NO / total (ERRADO)
--
-- Correcao:
--   p_outcome = TRUE (comprando SIM):
--     v_price_before = pool_YES / total  (CORRETO - mostra preco do SIM)
--     v_price_after  = new_pool_YES / total (CORRETO)
--
-- NOTA: Isso NAO afeta a logica de shares (v_shares_out) que esta correta.
--       Apenas corrige os valores retornados ao cliente para exibicao.

CREATE OR REPLACE FUNCTION rpc_buy_shares(
  p_market_id UUID,
  p_outcome BOOLEAN,
  p_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
  v_pool_yes NUMERIC;
  v_pool_no NUMERIC;
  v_outcome BOOLEAN;
  v_ends_at TIMESTAMP WITH TIME ZONE;
  v_k NUMERIC;
  v_new_pool_yes NUMERIC;
  v_new_pool_no NUMERIC;
  v_shares_out NUMERIC;
  v_price_before NUMERIC;
  v_price_after NUMERIC;
  v_position_id UUID;
BEGIN
  -- Obter usuario autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  -- Validar amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser positivo';
  END IF;

  -- Obter saldo do usuario
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM ledger_entries
  WHERE user_id = v_user_id;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponivel: R$ %', ROUND(v_balance, 2);
  END IF;

  -- Obter dados do mercado com lock
  SELECT pool_yes, pool_no, outcome, ends_at
  INTO v_pool_yes, v_pool_no, v_outcome, v_ends_at
  FROM markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mercado nao encontrado';
  END IF;

  IF v_outcome IS NOT NULL THEN
    RAISE EXCEPTION 'Mercado ja foi resolvido';
  END IF;

  IF v_ends_at < NOW() THEN
    RAISE EXCEPTION 'Mercado ja encerrou';
  END IF;

  -- Calcular constante k (Constant Product)
  v_k := v_pool_yes * v_pool_no;

  -- Calcular preco ANTES - CORRIGIDO: mostra preco do lado que esta comprando
  IF p_outcome THEN
    -- Comprando SIM: mostrar preco do SIM (pool_yes / total)
    v_price_before := v_pool_yes / (v_pool_yes + v_pool_no);
  ELSE
    -- Comprando NAO: mostrar preco do NAO (pool_no / total)
    v_price_before := v_pool_no / (v_pool_yes + v_pool_no);
  END IF;

  -- Aplicar CPMM (logica de shares esta correta)
  IF p_outcome THEN
    -- Comprando SIM: adiciona ao pool_yes, calcula novo pool_no mantendo k
    v_new_pool_yes := v_pool_yes + p_amount;
    v_new_pool_no := v_k / v_new_pool_yes;
    v_shares_out := v_pool_no - v_new_pool_no;
    -- Preco DEPOIS - CORRIGIDO: mostrar novo preco do SIM
    v_price_after := v_new_pool_yes / (v_new_pool_yes + v_new_pool_no);
  ELSE
    -- Comprando NAO: adiciona ao pool_no, calcula novo pool_yes mantendo k
    v_new_pool_no := v_pool_no + p_amount;
    v_new_pool_yes := v_k / v_new_pool_no;
    v_shares_out := v_pool_yes - v_new_pool_yes;
    -- Preco DEPOIS - CORRIGIDO: mostrar novo preco do NAO
    v_price_after := v_new_pool_no / (v_new_pool_yes + v_new_pool_no);
  END IF;

  -- Atualizar pools do mercado
  UPDATE markets
  SET pool_yes = v_new_pool_yes,
      pool_no = v_new_pool_no
  WHERE id = p_market_id;

  -- Debitar do ledger
  INSERT INTO ledger_entries (user_id, amount, category, reference_id, description)
  VALUES (
    v_user_id,
    -p_amount,
    'TRADE',
    p_market_id,
    'Compra de ' || ROUND(v_shares_out, 2) || ' acoes ' || CASE WHEN p_outcome THEN 'SIM' ELSE 'NAO' END
  );

  -- Atualizar/criar posicao
  INSERT INTO market_positions (user_id, market_id, shares_yes, shares_no, avg_cost_yes, avg_cost_no)
  VALUES (
    v_user_id,
    p_market_id,
    CASE WHEN p_outcome THEN v_shares_out ELSE 0 END,
    CASE WHEN p_outcome THEN 0 ELSE v_shares_out END,
    CASE WHEN p_outcome THEN p_amount / v_shares_out ELSE 0 END,
    CASE WHEN p_outcome THEN 0 ELSE p_amount / v_shares_out END
  )
  ON CONFLICT (user_id, market_id) DO UPDATE SET
    shares_yes = market_positions.shares_yes + CASE WHEN p_outcome THEN v_shares_out ELSE 0 END,
    shares_no = market_positions.shares_no + CASE WHEN p_outcome THEN 0 ELSE v_shares_out END,
    avg_cost_yes = CASE
      WHEN p_outcome THEN
        (market_positions.avg_cost_yes * market_positions.shares_yes + p_amount) /
        NULLIF(market_positions.shares_yes + v_shares_out, 0)
      ELSE market_positions.avg_cost_yes
    END,
    avg_cost_no = CASE
      WHEN NOT p_outcome THEN
        (market_positions.avg_cost_no * market_positions.shares_no + p_amount) /
        NULLIF(market_positions.shares_no + v_shares_out, 0)
      ELSE market_positions.avg_cost_no
    END,
    updated_at = NOW()
  RETURNING id INTO v_position_id;

  -- Registrar no audit log
  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data, metadata)
  VALUES (
    v_user_id,
    'BUY_SHARES',
    'market_positions',
    v_position_id,
    jsonb_build_object(
      'market_id', p_market_id,
      'outcome', p_outcome,
      'amount', p_amount,
      'shares', v_shares_out,
      'price_before', v_price_before,
      'price_after', v_price_after
    ),
    jsonb_build_object('source', 'rpc_buy_shares')
  );

  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'shares', ROUND(v_shares_out, 4),
    'outcome', p_outcome,
    'amount_spent', p_amount,
    'new_balance', v_balance - p_amount,
    'price_before', ROUND(v_price_before * 100, 0),
    'price_after', ROUND(v_price_after * 100, 0)
  );
END;
$$;

-- Atualizar comentario
COMMENT ON FUNCTION rpc_buy_shares IS 'Compra shares usando CPMM. price_before/price_after mostram probabilidade do lado comprado (corrigido em migration 010).';
