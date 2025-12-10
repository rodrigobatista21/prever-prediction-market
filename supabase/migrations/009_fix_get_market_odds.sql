-- Migration: 009_fix_get_market_odds
-- Descricao: Corrige formula invertida em get_market_odds
-- Data: 2025-12-10
-- Issue: price_yes e price_no estavam invertidos

-- A funcao original retornava:
--   price_yes = pool_NO / total   (ERRADO)
--   price_no  = pool_YES / total  (ERRADO)
--
-- Correcao:
--   price_yes = pool_YES / total  (CORRETO - probabilidade de SIM)
--   price_no  = pool_NO / total   (CORRETO - probabilidade de NAO)

CREATE OR REPLACE FUNCTION get_market_odds(p_market_id UUID)
RETURNS TABLE (
  price_yes NUMERIC,
  price_no NUMERIC,
  total_liquidity NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_pool_yes NUMERIC;
  v_pool_no NUMERIC;
BEGIN
  SELECT pool_yes, pool_no
  INTO v_pool_yes, v_pool_no
  FROM markets
  WHERE id = p_market_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Formula correta: price = pool_mesmo_lado / total
  -- Quanto mais dinheiro apostado em SIM, maior a probabilidade de SIM
  RETURN QUERY SELECT
    ROUND(v_pool_yes / (v_pool_yes + v_pool_no) * 100, 0),  -- price_yes CORRIGIDO
    ROUND(v_pool_no / (v_pool_yes + v_pool_no) * 100, 0),   -- price_no CORRIGIDO
    v_pool_yes + v_pool_no;
END;
$$;

-- Atualizar comentario
COMMENT ON FUNCTION get_market_odds IS 'Retorna probabilidades do mercado: price_yes = pool_yes/(pool_yes+pool_no), price_no = pool_no/(pool_yes+pool_no)';
