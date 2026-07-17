import { toast } from "sonner"

interface FeedbackOptions {
  id: string
  description?: string
}

export const feedback = {
  success(message: string, options: FeedbackOptions) {
    return toast.success(message, options)
  },
  error(message: string, options: FeedbackOptions) {
    return toast.error(message, options)
  },
  warning(message: string, options: FeedbackOptions) {
    return toast.warning(message, options)
  },
}

export type { FeedbackOptions }
