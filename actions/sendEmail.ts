'use server'

import { Resend } from 'resend'
import ParentEmail from '../emails/ParentEmail'
import * as React from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailParams {
  to: string
  subject: string
  content: string
}

export const sendEmailViaResend = async ({ to, subject, content }: SendEmailParams) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Mr.Yeti <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      react: React.createElement(ParentEmail, {
        subject,
        content,
        previewText: subject
      }),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Server action error:', error)
    return { success: false, error }
  }
}
