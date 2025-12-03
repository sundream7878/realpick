-- Add new columns for multi-select and text submission support
ALTER TABLE t_missions1 
ADD COLUMN IF NOT EXISTS f_submission_type text DEFAULT 'selection',
ADD COLUMN IF NOT EXISTS f_required_answer_count integer DEFAULT 1;

-- Comment on columns
COMMENT ON COLUMN t_missions1.f_submission_type IS 'Submission type: selection (default) or text';
COMMENT ON COLUMN t_missions1.f_required_answer_count IS 'Required number of answers for multi-select missions';
