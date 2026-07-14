
-- ─────────────────────── Attach missing triggers ───────────────────────
CREATE TRIGGER requests_validate_biu
  BEFORE INSERT OR UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_request();

CREATE TRIGGER requests_guard_bu
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_request_update();

CREATE TRIGGER offers_validate_biu
  BEFORE INSERT OR UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.validate_offer();

CREATE TRIGGER offers_guard_bu
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.guard_offer_update();

CREATE TRIGGER offers_sync_count_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.sync_request_offers_count();

CREATE TRIGGER offers_on_awarded_au
  AFTER UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.on_offer_awarded();

-- ─────────────────────── Notifications ───────────────────────
CREATE TYPE public.notification_type AS ENUM (
  'request_cancelled',
  'request_awarded',
  'request_closed',
  'offer_received',
  'offer_selected',
  'offer_rejected',
  'offer_withdrawn'
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- UPDATE limited to marking as read; guard trigger below prevents other edits.
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Prevent users from mutating anything other than read_at
CREATE OR REPLACE FUNCTION public.guard_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id    <> OLD.user_id    THEN RAISE EXCEPTION 'immutable'; END IF;
  IF NEW.type       <> OLD.type       THEN RAISE EXCEPTION 'immutable'; END IF;
  IF NEW.title      <> OLD.title      THEN RAISE EXCEPTION 'immutable'; END IF;
  IF NEW.body IS DISTINCT FROM OLD.body               THEN RAISE EXCEPTION 'immutable'; END IF;
  IF NEW.request_id IS DISTINCT FROM OLD.request_id   THEN RAISE EXCEPTION 'immutable'; END IF;
  IF NEW.offer_id   IS DISTINCT FROM OLD.offer_id     THEN RAISE EXCEPTION 'immutable'; END IF;
  IF NEW.created_at <> OLD.created_at THEN RAISE EXCEPTION 'immutable'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_guard_bu
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notification_update();

-- ─────────────────────── Notification producers ───────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'cancelled' THEN
    INSERT INTO public.notifications (user_id, type, title, body, request_id)
    VALUES (NEW.customer_id, 'request_cancelled', 'הבקשה בוטלה',
            'הבקשה "' || NEW.title || '" בוטלה.', NEW.id);
  ELSIF NEW.status = 'awarded' THEN
    INSERT INTO public.notifications (user_id, type, title, body, request_id, offer_id)
    VALUES (NEW.customer_id, 'request_awarded', 'נבחר ספק לבקשה',
            'בחרתם ספק לבקשה "' || NEW.title || '".', NEW.id, NEW.selected_offer_id);
  ELSIF NEW.status = 'closed' THEN
    INSERT INTO public.notifications (user_id, type, title, body, request_id)
    VALUES (NEW.customer_id, 'request_closed', 'הבקשה נסגרה',
            'הבקשה "' || NEW.title || '" נסגרה.', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER requests_notify_status_au
  AFTER UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_request_status();

CREATE OR REPLACE FUNCTION public.notify_on_offer_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer UUID;
  _title TEXT;
BEGIN
  SELECT customer_id, title INTO _customer, _title
  FROM public.requests WHERE id = COALESCE(NEW.request_id, OLD.request_id);

  IF TG_OP = 'INSERT' AND NEW.status = 'submitted' THEN
    INSERT INTO public.notifications (user_id, type, title, body, request_id, offer_id)
    VALUES (_customer, 'offer_received', 'הצעה חדשה התקבלה',
            'התקבלה הצעה חדשה עבור "' || _title || '".', NEW.request_id, NEW.id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status = 'selected' THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, offer_id)
      VALUES (NEW.supplier_id, 'offer_selected', 'ההצעה שלכם נבחרה',
              'הלקוח בחר את הצעתכם עבור "' || _title || '".', NEW.request_id, NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, offer_id)
      VALUES (NEW.supplier_id, 'offer_rejected', 'ההצעה לא נבחרה',
              'ההצעה לבקשה "' || _title || '" לא נבחרה.', NEW.request_id, NEW.id);
    ELSIF NEW.status = 'withdrawn' THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, offer_id)
      VALUES (_customer, 'offer_withdrawn', 'ספק משך את הצעתו',
              'הצעה עבור "' || _title || '" נמשכה על ידי הספק.', NEW.request_id, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER offers_notify_aiu
  AFTER INSERT OR UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_offer_change();

-- ─────────────────────── Storage policies (request-attachments) ───────────────────────
-- Path convention: {auth.uid()}/{request_id}/{filename}

CREATE POLICY "Customer uploads to own open request folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'request-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id::text = (storage.foldername(name))[2]
        AND r.customer_id = auth.uid()
        AND r.status = 'open'
    )
  );

CREATE POLICY "Customer reads own request files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Customer deletes files from own open request"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id::text = (storage.foldername(name))[2]
        AND r.customer_id = auth.uid()
        AND r.status = 'open'
    )
  );
