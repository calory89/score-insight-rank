
-- Allow admin to delete error logs
CREATE POLICY "Admin can delete error logs"
ON public.error_logs
FOR DELETE
USING (is_admin(auth.uid()));
