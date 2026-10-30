-- Add UPDATE policy so users can update their own analyses (for duplicate detection)
CREATE POLICY "Users can update their own analyses"
ON public.analyses
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Clean up the fabricated Idealista records
DELETE FROM public.analyses WHERE url = 'https://www.idealista.com/inmueble/110397492/' AND price IN ('0', '€225,000');
