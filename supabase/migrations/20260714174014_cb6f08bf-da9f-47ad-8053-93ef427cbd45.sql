
REVOKE EXECUTE ON FUNCTION public.notify_on_request_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_offer_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_offer_awarded() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_request_offers_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
