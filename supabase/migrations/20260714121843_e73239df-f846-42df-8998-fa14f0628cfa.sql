CREATE UNIQUE INDEX IF NOT EXISTS offers_one_selected_per_request
  ON public.offers (request_id)
  WHERE status = 'selected';