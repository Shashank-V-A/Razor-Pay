export type RazorpayCheckoutSuccess = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

type RazorpayConstructor = new (options: Record<string, unknown>) => { open: () => void }

function razorpayCtor(): RazorpayConstructor | undefined {
  return (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay
}

function loadCheckoutScript(): Promise<void> {
  if (razorpayCtor()) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const finish = () => {
      if (razorpayCtor()) resolve()
      else reject(new Error('Could not load Razorpay Checkout'))
    }
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    )
    if (existing) {
      if (razorpayCtor()) {
        resolve()
        return
      }
      existing.addEventListener('load', finish)
      existing.addEventListener('error', () =>
        reject(new Error('Could not load Razorpay Checkout')),
      )
      window.setTimeout(finish, 8000)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = finish
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout'))
    document.body.appendChild(script)
  })
}

export async function openRazorpayCheckout(options: {
  key: string
  orderId: string
  amountPaise?: number
  name?: string
  description?: string
  prefillEmail?: string
}): Promise<RazorpayCheckoutSuccess> {
  await loadCheckoutScript()
  const Razorpay = razorpayCtor()
  if (!Razorpay) {
    throw new Error('Razorpay Checkout is not available')
  }
  if (!options.key || !options.orderId) {
    throw new Error('Missing Razorpay Checkout key or order id')
  }

  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: options.key,
      order_id: options.orderId,
      amount: options.amountPaise,
      currency: 'INR',
      name: options.name || 'PrizeVault',
      description: options.description || 'Prize escrow deposit',
      // Test Mode: UPI opens a live QR that cannot be paid with a real app.
      // NPCI also retired UPI Collect (typed VPA) in 2026. Use mock netbanking.
      prefill: {
        email: options.prefillEmail || undefined,
        contact: '9000090000',
        method: 'netbanking',
      },
      method: {
        upi: false,
        netbanking: true,
        card: true,
        wallet: false,
        emi: false,
        paylater: false,
      },
      config: {
        display: {
          blocks: {
            banks: {
              name: 'Test netbanking — pick any bank, then Success',
              instruments: [{ method: 'netbanking' }],
            },
            cards: {
              name: 'Domestic card (Mastercard 5267 3181 8797 5449)',
              instruments: [{ method: 'card' }],
            },
          },
          hide: [{ method: 'upi' }],
          sequence: ['block.banks', 'block.cards'],
          preferences: { show_default_blocks: false },
        },
      },
      theme: { color: '#1a56db' },
      handler: (response: RazorpayCheckoutSuccess) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error('Checkout closed before payment')),
      },
    })
    checkout.open()
  })
}
