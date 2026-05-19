import Stripe from 'stripe'
import { env, requireStripe } from '../env'

let client: Stripe | null = null

export function getStripe(): Stripe {
  requireStripe()
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    })
  }
  return client
}

export interface CreateCheckoutParams {
  listingId: string
  listingTitle: string
  amountCents: number
  vendorPayoutCents: number
  commissionCents: number
  vendorStripeAccountId: string
  successUrl: string
  cancelUrl: string
  buyerEmail?: string
  metadata?: Record<string, string>
}

export async function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: params.listingTitle },
          unit_amount: params.amountCents,
        },
        quantity: 1,
      },
    ],
    customer_email: params.buyerEmail,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    payment_intent_data: {
      application_fee_amount: params.commissionCents,
      transfer_data: {
        destination: params.vendorStripeAccountId,
      },
    },
    metadata: {
      listing_id: params.listingId,
      ...params.metadata,
    },
  })
}

export async function createConnectAccountLink(
  vendorStripeAccountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<Stripe.AccountLink> {
  const stripe = getStripe()
  return stripe.accountLinks.create({
    account: vendorStripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
}

export async function createConnectAccount(
  email: string,
  displayName: string,
): Promise<Stripe.Account> {
  const stripe = getStripe()
  return stripe.accounts.create({
    type: 'express',
    email,
    business_profile: { name: displayName },
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
  })
}
