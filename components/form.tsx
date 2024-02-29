'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

import { z } from 'zod'
import { FormDataSchema } from '@/lib/schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, SubmitHandler } from 'react-hook-form'

import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth'
import { auth } from '../lib/firebase'
import api, { setAuthorization } from '../lib/api'

interface SelectChangeEvent extends React.ChangeEvent<HTMLSelectElement> {}

type Inputs = z.infer<typeof FormDataSchema>

const steps = [
  {
    id: 'STEP 1',
    name: 'Phone Number',
    fields: ['phoneNumber']
  },
  {
    id: 'STEP 2',
    name: 'OTP',
    fields: ['otp']
  },

//   {how many bottles you have ?: "12", which character is missing a b d ?: "Forenoon(before 12 pm)"}
// how many bottles you have ?
// : 
// "12"
// which character is missing a b d ?
// : 
// "Forenoon(before 12 pm)"

  { id: 'STEP 3', name: 'New Request', fields: ['request'] }, //walkin -> no contain -> time
  {
    id: 'STEP 4',
    name: 'Address Type',
    fields: ['addressType']
  },
  {
    id: 'STEP 5',
    name: 'Address Verification',
    fields: ['addressVerification']
  },

  {
    id: 'STEP 6',
    name: 'Container Number',
    fields: ['containerNumber']
  },
  {
    id: 'STEP 7',
    name: 'Preferred Time',
    fields: ['preferredTime']
  },
  {
    id: 'STEP 8',
    name: 'Complete Request',
    fields: ['submit']
  }
]

const registrationSteps = [
  {
    id: 'STEP 1',
    name: 'Full Name',
    fields: ['fullName']
  },
  {
    id: 'STEP 2',
    name: 'Email Address',
    fields: ['email']
  },
  {
    id: 'STEP 3',
    name: 'Profile Address',
    fields: ['address']
  },
  { id: 'STEP 4', name: 'Complete Registration', fields: ['register'] }
]

export default function Form() {
  const [previousStep, setPreviousStep] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [verificationId, setVerificationId] = useState<Awaited<
    ReturnType<typeof signInWithPhoneNumber>
  > | null>(null)
  const [isRegistered, setIsRegistered] = useState(true)
  const delta = currentStep - previousStep
  const [isValidAddress, setIsValidAddress] = useState(true)
  const [isSavedAddress, setIsSavedAddress] = useState(true)

  const {
    register,
    getValues,
    setValue,
    handleSubmit,
    watch,
    reset,
    trigger,
    formState: { errors }
  } = useForm<Inputs>({
    resolver: zodResolver(FormDataSchema)
  })

  const processForm: SubmitHandler<Inputs> = data => {
    // I'm just logging it here, do whatever you want with the data from here.
    console.log(data)
    reset()
    // you can redirect to a new page here
  }

  type FieldName = keyof Inputs

  const next = async () => {
    console.log('next', currentStep)
    // const fields = steps[currentStep].fields
    // const output = await trigger(fields as FieldName[], { shouldFocus: true })

    // if (!output) return

    if (currentStep < steps.length + registrationSteps.length - 1) {
      if (currentStep === steps.length + registrationSteps.length - 2) {
        await handleSubmit(processForm)()
        await newSubmission()
      }
      setPreviousStep(currentStep)
      setCurrentStep(step => step + 1)
    }
  }

  const prev = () => {
    if (currentStep > 0) {
      setPreviousStep(currentStep)
      setCurrentStep(step => step - 1)
    }
  }

  const handleAddressTypeChange = (event: SelectChangeEvent) => {
    const selectedValue = event.target.value
    setIsSavedAddress(selectedValue === 'saved')
    setValue('addressType', selectedValue)
  }

  const handleAddressValidationChange = (event: SelectChangeEvent) => {
    const selectedValue = event.target.value
    setIsValidAddress(selectedValue === 'No')
  }

  const handleSendOtp = async () => {
    console.log('otp send')
    try {
      const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      })
      const value = getValues('phoneNumber')
      const phoneNumber = `+91${value}`
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        appVerifier
      )
      const response = await api.post('/api/v1/auth/login', { phone: value })
      if (response.data.success) {
        setVerificationId(confirmationResult)
        next()
      } else {
        alert('Phone verification request failed.')
      }
    } catch (error) {
      alert('Phone verification request failed.')
    }
  }

  const handleVerifyOtp = async () => {
    console.log('atleat here')
    try {
      console.log('inside', verificationId)
      const phone = getValues('phoneNumber')
      const otp = getValues('otp')
      const user = await verificationId?.confirm(otp)
      const response = await api.post('/api/v1/auth/validate-user', {
        phone: phone,
        otp: otp
      })
      if (response.data.success) {
        setAuthorization(response.data.result.token)
        if (response.data.result.isRegistered) {
          console.log('registered')
          setIsRegistered(true)
          setCurrentStep(step => step + 5)
          return
        }
        console.log('not registered')
        setIsRegistered(false)
        next()
      }
    } catch (error) {
      alert('OTP verification failed.')
    }
  }

  const profileUpdate = (key: any, address: any) => {
    console.log('profile update')
  }

  const handleGetLocation = (key: string, isProfileUpdate: boolean) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords
          const address = `${latitude},${longitude}`
          if (isProfileUpdate) {
            localStorage.setItem('address', address)
            profileUpdate(key, address)
          } else {
            localStorage.setItem('address', address)
          }
        },
        error => {
          alert('Geolocation is not supported by your browser1')
        }
      )
    } else {
      alert('Geolocation is not supported by your browser2')
    }
  }

  const updateProfile = async (
    fullName: string,
    email: string,
    address: string
  ) => {
    try {
      const response = await api.put('/api/v1/auth/profile-create', {
        fullname: fullName,
        email: email,
        address: address
      })

      if (response.data.success) {
        localStorage.setItem('address', address)
        alert('Profile updated successfully.')
      } else {
        alert('Profile update failed.')
      }
    } catch (error) {}
  }

  const newSubmission = async () => {
    const address_value = localStorage.getItem("address");
    const submitData = {
      "how many bottles you have ?": getValues("containerNumber"),
      "which character is missing a b d ?": getValues("preferredTime"),
      "confirmLocationSave" : getValues("addressVerification")
    };
    try {
      const response = await api.post("/api/v1/create-new-submission", {
        pickUpAddress: address_value,
        no_of_bottles: getValues("containerNumber"),
        pickUpType: getValues("request"),
        info: { ...submitData },
      });
      if (response.status === 200) {
        console.log(response);
        alert("Request submitted successfully.");
      } else {
        alert("Request submission failed.");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleAllCases = async () => {
    if (currentStep === 0) {
      console.log('called 0')
      await handleSendOtp()
      // next()
    } else if (currentStep === 1) {
      console.log('called 1')
      await handleVerifyOtp()
    } else if (currentStep === 2) {
      console.log('called 2')
      next()
    } else if (currentStep === 4) {
      console.log('called 3')
      handleGetLocation('address', false)
      next()
    } else if (currentStep === 5) {
      setIsRegistered(true)
      const fullname = getValues('fullName')
      const email = getValues('email')
      const address = getValues('address')
      updateProfile(fullname, email, address)
      next()
    } else {
      next()
    }
  }

  useEffect(() => {
    console.log('currentStep', currentStep)
    localStorage.setItem('address', getValues('address'))
  }, [currentStep, getValues])

  return (
    <section className='absolute inset-0 flex flex-col justify-between p-24'>
      {/* steps */}
      <nav aria-label='Progress'>
        <ol role='list' className='space-y-4 md:flex md:space-x-8 md:space-y-0'>
          {isRegistered
            ? steps.map((step, index) => (
                <li key={step.name} className='md:flex-1'>
                  <div
                    className={`group flex w-full flex-col border-l-4 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 ${currentStep - 4 >= index ? 'border-[#02b154]' : 'border-gray-200'}`}
                  >
                    <span
                      className={`text-xl font-medium transition-colors ${currentStep - 4 >= index ? 'text-[#02b154]' : 'text-gray-500'}`}
                    >
                      {step.id}
                    </span>
                    <span className='text-sm font-medium'>{step.name}</span>
                  </div>
                </li>
              ))
            : registrationSteps.map((step, index) => (
                <li key={step.name} className='md:flex-1'>
                  <div
                    className={`group flex w-full flex-col border-l-4 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 ${currentStep - 2 >= index ? 'border-[#02b154]' : 'border-gray-200'}`}
                  >
                    <span
                      className={`text-xl font-medium transition-colors ${currentStep - 2 >= index ? 'text-[#02b154]' : 'text-gray-500'}`}
                    >
                      {step.id}
                    </span>
                    <span className='text-sm font-medium'>{step.name}</span>
                  </div>
                </li>
              ))}
        </ol>
      </nav>

      {/* Form */}
      <form className='mt-12 py-12' onSubmit={handleSubmit(processForm)}>
        {currentStep === 0 && (
          <motion.div
            initial={{ x: delta >= 0 ? '50%' : '-50%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
              Please enter your phone number
            </h2>
            <p className='mt-1 text-base leading-6 text-gray-600'>
              You will be receiving an OTP on this number.
            </p>
            <div id='recaptcha-container'></div>
            <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
              <div className='sm:col-span-3'>
                <label
                  htmlFor='phoneNumber'
                  className='block text-base font-medium leading-6 text-gray-900'
                >
                  Phone Number
                </label>
                <div className='mt-2'>
                  <input
                    type='text'
                    id='phoneNumber'
                    {...register('phoneNumber')}
                    className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                  />
                  {errors.phoneNumber?.message && (
                    <p className='mt-2 text-sm text-red-400'>
                      {errors.phoneNumber.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 1 && (
          <motion.div
            initial={{ x: delta >= 0 ? '50%' : '-50%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
              Please enter the OTP sent to your phone.
            </h2>
            <p className='mt-1 text-base leading-6 text-gray-600'>
              Click{' '}
              <span
                className='hover:cursor-pointer'
                onClick={() => {
                  // Resend OTP
                  console.log('Resend OTP')
                }}
              >
                <b>here</b>
              </span>{' '}
              to resend the OTP.
            </p>
            <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
              {/* <div id='recaptcha-container'></div> */}
              <div className='sm:col-span-3'>
                <label
                  htmlFor='otp'
                  className='block text-sm font-medium leading-6 text-gray-900'
                >
                  OTP
                </label>
                <div className='mt-2'>
                  <input
                    type='text'
                    id='otp'
                    {...register('otp')}
                    className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                  />
                  {errors.otp?.message && (
                    <p className='mt-2 text-sm text-red-400'>
                      {errors.otp.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            initial={{ x: delta >= 0 ? '50%' : '-50%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
              Please enter your full name
            </h2>
            <p className='mt-1 text-base leading-6 text-gray-600'>
              We will refer to you by this name.
            </p>
            <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
              <div className='sm:col-span-3'>
                <label
                  htmlFor='fullName'
                  className='block text-sm font-medium leading-6 text-gray-900'
                >
                  Full Name
                </label>
                <div className='mt-2'>
                  <input
                    type='text'
                    id='fullName'
                    {...register('fullName')}
                    className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                  />
                  {errors.fullName?.message && (
                    <p className='mt-2 text-sm text-red-400'>
                      {errors.fullName.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {currentStep === 3 && (
          <motion.div
            initial={{ x: delta >= 0 ? '50%' : '-50%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
              Email Address
            </h2>
            <p className='mt-1 text-base leading-6 text-gray-600'>
              Please enter your email address here.
            </p>
            <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
              <div className='sm:col-span-3'>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium leading-6 text-gray-900'
                >
                  Email
                </label>
                <div className='mt-2'>
                  <input
                    type='email'
                    id='email'
                    {...register('email')}
                    className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                  />
                  {errors.email?.message && (
                    <p className='mt-2 text-sm text-red-400'>
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 4 && (
          <motion.div
            initial={{ x: delta >= 0 ? '50%' : '-50%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
              Address
            </h2>
            <p className='mt-1 text-base leading-6 text-gray-600'>
              Please enter your complete address here.
            </p>

            <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
              <div className='sm:col-span-3'>
                <label
                  htmlFor='address'
                  className='block text-sm font-medium leading-6 text-gray-900'
                >
                  Address
                </label>
                <div className='mt-2'>
                  <textarea
                    id='address'
                    {...register('address')}
                    className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                  />
                  {errors.address?.message && (
                    <p className='mt-2 text-sm text-red-400'>
                      {errors.address.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 5 && (
          <>
            <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
              Complete Registration
            </h2>
            <p className='mt-1 text-base leading-6 text-gray-600'>
              Thank you for your submission.
            </p>
          </>
        )}

        {currentStep === 6 && (
          <>
            <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
              New Request
            </h2>
            <p className='mt-1 text-base leading-6 text-gray-600'>
              Please select the type of request you want to make.
            </p>
            <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
              <div className='sm:col-span-3'>
                <label
                  htmlFor='request'
                  className='block text-sm font-medium leading-6 text-gray-900'
                >
                  Request
                </label>
                <div className='mt-2'>
                  <select
                    id='request'
                    {...register('request')}
                    className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                  >
                    <option value='pickup'>Pickup</option>
                    <option value='walkin'>Walkin</option>
                  </select>
                  {errors.request?.message && (
                    <p className='mt-2 text-sm text-red-400'>
                      {errors.request.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {currentStep === 7 && (
          <>
            {isSavedAddress ? (
              <>
                <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
                  Address Type
                </h2>
                <p className='mt-1 text-base leading-6 text-gray-600'>
                  Please select the type of address you want to use.
                </p>
                <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
                  <div className='sm:col-span-3'>
                    <label
                      htmlFor='addressType'
                      className='block text-sm font-medium leading-6 text-gray-900'
                    >
                      Address Type
                    </label>
                    <div className='mt-2'>
                      <select
                        id='addressType'
                        onChange={handleAddressTypeChange}
                        // {...register('addressType')}
                        className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                      >
                        <option value='saved'>Saved Address</option>
                        <option value='new'>New Address</option>
                      </select>
                      {errors.addressType?.message && (
                        <p className='mt-2 text-sm text-red-400'>
                          {errors.addressType.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
                  New Address
                </h2>
                <p className='mt-1 text-base leading-6 text-gray-600'>
                  Please enter your complete address here.
                </p>

                <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
                  <div className='sm:col-span-3'>
                    <label
                      htmlFor='address'
                      className='block text-sm font-medium leading-6 text-gray-900'
                    >
                      Address
                    </label>
                    <div className='mt-2'>
                      <textarea
                        id='address'
                        {...register('address')}
                        className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                      />
                      {errors.address?.message && (
                        <p className='mt-2 text-sm text-red-400'>
                          {errors.address.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  className='mt-4 rounded bg-green-300 px-4 py-2 font-bold text-white hover:bg-green-700'
                  onClick={() => setIsSavedAddress(true)}
                >
                  update
                </button>
              </>
            )}
          </>
        )}

        {currentStep === 8 && (
          <>
            {isValidAddress ? (
              <>
                <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
                  Address Verification
                </h2>
                <p className='mt-1 text-base leading-6 text-gray-600'>
                  Your saved Address is: {localStorage.getItem('address')}
                </p>
                <p className='mt-1 text-base leading-6 text-gray-600'>
                  Are you sure this is a valid address?
                </p>
                <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
                  <div className='sm:col-span-3'>
                    <label
                      htmlFor='addressVerification'
                      className='block text-sm font-medium leading-6 text-gray-900'
                    >
                      Address Verification
                    </label>
                    <div className='mt-2'>
                      <select
                        id='addressVerification'
                        {...register('addressVerification')}
                        onChange={handleAddressValidationChange}
                        className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                      >
                        <option value='yes'>Yes</option>
                        <option value='no'>No</option>
                      </select>
                      {errors.addressVerification?.message && (
                        <p className='mt-2 text-sm text-red-400'>
                          {errors.addressVerification.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
                  New Address
                </h2>
                <p className='mt-1 text-base leading-6 text-gray-600'>
                  Please enter your complete address here.
                </p>

                <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
                  <div className='sm:col-span-3'>
                    <label
                      htmlFor='address'
                      className='block text-sm font-medium leading-6 text-gray-900'
                    >
                      Address
                    </label>
                    <div className='mt-2'>
                      <textarea
                        id='address'
                        {...register('address')}
                        className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                      />
                      {errors.address?.message && (
                        <p className='mt-2 text-sm text-red-400'>
                          {errors.address.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  className='mt-4 rounded bg-green-300 px-4 py-2 font-bold text-white hover:bg-green-700'
                  onClick={() => setIsValidAddress(true)}
                >
                  update
                </button>
              </>
            )}
          </>
        )}

        {currentStep === 9 && (
          <>
            <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
              Container Number
            </h2>
            <p className='mt-1 text-base leading-6 text-gray-600'>
              Please enter the number of containers.
            </p>
            <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
              <div className='sm:col-span-3'>
                <label
                  htmlFor='containerNumber'
                  className='block text-sm font-medium leading-6 text-gray-900'
                >
                  Container Number
                </label>
                <div className='mt-2'>
                  <input
                    type='text'
                    id='containerNumber'
                    {...register('containerNumber')}
                    className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                  />
                  {errors.containerNumber?.message && (
                    <p className='mt-2 text-sm text-red-400'>
                      {errors.containerNumber.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {currentStep === 10 && (
          <>
            <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
              Preferred Time
            </h2>
            <p className='mt-1 text-base leading-6 text-gray-600'>
              Please select the preferred time.
            </p>
            <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
              <div className='sm:col-span-3'>
                <label
                  htmlFor='preferredTime'
                  className='block text-sm font-medium leading-6 text-gray-900'
                >
                  Preferred Time
                </label>
                <div className='mt-2'>
                  <select
                    id='preferredTime'
                    {...register('preferredTime')}
                    className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6'
                  >
                    <option value='Forenoon(before 12 pm)'>
                      Forenoon(before 12 pm)
                    </option>
                    <option value='Afternoon(after 12 pm)'>
                      Afternoon(after 12 pm)
                    </option>
                    <option value='Evening(after 6 pm)'>
                      Evening(after 6 pm)
                    </option>
                  </select>
                  {errors.preferredTime?.message && (
                    <p className='mt-2 text-sm text-red-400'>
                      {errors.preferredTime.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {currentStep === 11 && (
          <>
            <h2 className='text-3xl font-semibold leading-7 text-gray-900'>
              Complete Request
            </h2>
            <p className='mt-1 text-base leading-6 text-gray-600'>
              Thank you for your submission.
            </p>
          </>
        )}
      </form>

      {/* Navigation */}
      <div className='mt-8 pt-5'>
        <div className='flex justify-between'>
          <button
            type='button'
            onClick={prev}
            disabled={currentStep === 0 || currentStep === 6}
            className='rounded bg-white px-2 py-1 text-sm font-semibold text-sky-900 shadow-sm ring-1 ring-inset ring-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth='1.5'
              stroke='currentColor'
              className='h-6 w-6'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M15.75 19.5L8.25 12l7.5-7.5'
              />
            </svg>
          </button>
          <button
            type='button'
            onClick={handleAllCases}
            disabled={
              currentStep === steps.length + registrationSteps.length - 1
            }
            className='rounded bg-white px-2 py-1 text-sm font-semibold text-sky-900 shadow-sm ring-1 ring-inset ring-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth='1.5'
              stroke='currentColor'
              className='h-6 w-6'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M8.25 4.5l7.5 7.5-7.5 7.5'
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
