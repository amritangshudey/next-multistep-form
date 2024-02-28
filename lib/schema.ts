import { z } from 'zod'

export const FormDataSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  // email: z.string().min(1, 'Email is required').email('Invalid email address'),
  address: z.string().min(1, 'Address is required'),
  phoneNumber: z
    .string()
    .length(10, 'Phone number should be 10 digits long')
    .regex(/^\d+$/, 'Phone number should only contain numbers'),
  otp: z
    .string()
    .length(6, 'OTP should be 6 digits long')
    .regex(/^\d+$/, 'OTP should only contain numbers')
})
