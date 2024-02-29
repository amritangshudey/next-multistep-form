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
    .regex(/^\d+$/, 'OTP should only contain numbers'),
  email: z.string().email('Invalid email address'),
  request: z.enum(['pickup', 'walkin']),
  addressType: z.enum(['saved', 'new']),
  addressVerification: z.string().min(1, 'Address verification is required'),
  containerNumber: z.string().regex(/^\d+$/, 'Should only contain numbers').min(1, 'Container number is required'),
  preferredTime: z.enum(['Forenoon(before 12 pm)', 'Afternoon(after 12 pm)', 'Evening(after 6 pm)']),
})
