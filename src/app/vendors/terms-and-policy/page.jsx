import Link from "next/link";
import { ArrowLeft, BadgeCheck, CreditCard, FileText, ShieldCheck, Store } from "lucide-react";

const termsVersion = "vendor-terms-2026-05-12";

const sections = [
  {
    title: "Agreement Status",
    body: [
      "This document is the standard Vendor Onboarding and Merchant Agreement for businesses operating on the MelaChow platform.",
      "It is written in clear business language so each Vendor can understand the commercial, operational, payment, refund, and platform rules before joining.",
      "By signing this document, submitting the Vendor registration form, ticking the required digital acceptance box, or continuing to operate on MelaChow after approval, the Vendor agrees to be bound by this agreement and the platform policies referenced in it.",
    ],
  },
  {
    title: "1. Parties",
    body: [
      "This agreement is between SamkaTech Limited, the legal operator of MelaChow, and the restaurant, food vendor, merchant, or business registering or operating on the platform.",
      "SamkaTech Limited is the legal contracting entity. CAC registration number: 9513537. Business address: 1, Akin Ogunlewe Street, Igbogbo, Ikorodu, Lagos State, Nigeria.",
      "MelaChow is a food ordering, delivery, wallet, payment, logistics, and vendor management platform operated under SamkaTech Limited.",
      "The Vendor confirms that the person signing or accepting this agreement has authority to act for the Vendor business.",
    ],
  },
  {
    title: "2. Purpose of This Agreement",
    body: [
      "This agreement explains the business relationship between MelaChow and the Vendor.",
      "It covers vendor onboarding, order handling, payment and payout terms, commission and service fees, refund responsibility, delivery responsibility, platform suspension rules, future monetization, customer data handling, termination, and dispute resolution.",
      "By accepting this agreement, the Vendor agrees to operate on MelaChow according to these terms.",
    ],
  },
  {
    title: "3. Effective Date and Term",
    body: [
      "This agreement becomes effective on the earliest of these dates: the date the Vendor signs this document, accepts the digital terms during registration, is approved by MelaChow, or first receives, accepts, or fulfils an order through MelaChow.",
      "This agreement continues until either party ends the relationship in line with this agreement.",
    ],
  },
  {
    title: "4. Digital Terms and Policy Acceptance",
    body: [
      "Before Vendor registration can be submitted, the Vendor must tick the required checkbox confirming that the Vendor has read, understood, and agreed to the MelaChow Vendor Terms, Payout Policy, Refund Policy, Data Policy, and Platform Rules.",
      "MelaChow may store proof of this acceptance, including acceptance status, acceptance date and time, terms version, registration source, IP address where available, and device or browser user agent where available.",
      `The current digital terms version is ${termsVersion}.`,
    ],
  },
  {
    title: "5. Meaning of Key Terms",
    body: [
      "Completed order means an order that has been paid for, accepted, prepared, delivered, or otherwise closed as successful on the platform.",
      "Vendor wallet means the platform wallet or ledger where Vendor earnings, deductions, refunds, and payout records may be tracked.",
      "Customer service fee means a fee charged by MelaChow to customers for use of the platform.",
      "Commission means the percentage or amount MelaChow may deduct from Vendor earnings.",
      "Payout means transfer of available Vendor earnings from the Vendor wallet to the Vendor's verified bank account.",
      "Order issue means any complaint, refund request, delivery issue, missing item, wrong item, payment issue, chargeback, or dispute connected to an order.",
    ],
  },
  {
    title: "6. Vendor Onboarding Requirements",
    body: [
      "Before a Vendor can fully operate on MelaChow, the Vendor must provide correct business and payout information.",
      "For the current MelaChow MVP onboarding process, the Vendor is required to provide business name, business owner or authorized representative name, business phone number, email address, business address, store description, cuisine or food categories, store logo or image, operating hours, and payout bank details.",
      "Payout bank details must include bank name and account number. The account name is verified automatically through MelaChow's payment provider and may not be entered manually by the Vendor.",
      "If the Vendor's state or city is not yet listed in MelaChow's active service locations, the Vendor may type the requested state and city during registration. That location will be reviewed by MelaChow before approval, and MelaChow may create or assign the correct state and city record in the system.",
      "MelaChow does not currently require CAC registration details, Tax Identification Number, or valid identification documents as standard MVP onboarding requirements. MelaChow may request additional verification later if required for compliance, fraud prevention, payout safety, dispute resolution, or platform risk review.",
      "The Vendor confirms that all information provided to MelaChow is true, accurate, and current.",
      "If any information changes, the Vendor must inform MelaChow as soon as reasonably possible.",
      "MelaChow may rely on the information supplied by the Vendor. If false, incomplete, or misleading information causes loss, failed payout, customer complaint, regulatory issue, or payment dispute, the Vendor will be responsible for the result.",
    ],
  },
  {
    title: "7. Vendor Approval",
    body: [
      "Submitting onboarding information does not automatically guarantee approval.",
      "MelaChow may review the Vendor's information before activating the Vendor account.",
      "MelaChow may reject, delay, or pause onboarding if required information is incomplete, bank details cannot be verified, business information appears incorrect, the Vendor cannot reasonably fulfil orders, the Vendor location is not yet supported, or there are operational or compliance concerns.",
      "Approval may be withdrawn if MelaChow later discovers false information, poor order fulfilment, or risk to customers, riders, or the platform.",
    ],
  },
  {
    title: "8. Vendor Account and Dashboard",
    body: [
      "Once approved, the Vendor may receive access to a vendor dashboard or account.",
      "The Vendor is responsible for keeping login details secure, managing menu availability, updating opening and closing hours, accepting or rejecting orders on time, marking orders correctly, ensuring payout details are correct, and reporting account issues quickly.",
      "Any action taken through the Vendor account may be treated as an action taken by the Vendor.",
      "The Vendor must not share dashboard access with unauthorized persons. If the Vendor suspects unauthorized access, the Vendor must notify MelaChow immediately.",
    ],
  },
  {
    title: "9. Menu, Pricing, and Availability",
    body: [
      "The Vendor is responsible for ensuring that menu items, prices, descriptions, and availability are accurate.",
      "Menu prices shown on MelaChow must be honoured unless corrected before an order is placed. Unavailable items should be marked unavailable quickly. Food descriptions should not mislead customers. Images should reasonably represent the food being sold.",
      "Price changes should be made through the platform or communicated to MelaChow where manual assistance is needed.",
      "MelaChow may remove or hide menu items that are misleading, unavailable, inappropriate, or likely to cause customer disputes.",
      "Where an incorrect price or unavailable item causes an order issue, MelaChow may cancel the order, request replacement, issue a refund, or apply a wallet deduction where the issue was caused by the Vendor.",
    ],
  },
  {
    title: "10. Order Acceptance and Preparation",
    body: [
      "The Vendor must make reasonable efforts to accept or reject customer orders quickly.",
      "The expected order acceptance time is within 5 minutes of receiving the order notification, unless there is a system issue or another reasonable cause.",
      "Once an order is accepted, the Vendor is expected to prepare the food according to the order, package it properly, mark it ready when preparation is complete, avoid unnecessary delay, and notify MelaChow if there is a serious issue.",
      "The Vendor must not accept an order if the Vendor knows it cannot prepare the order within a reasonable time.",
    ],
  },
  {
    title: "11. Packaging Standards",
    body: [
      "The Vendor is responsible for packaging food safely and neatly.",
      "Packaging should protect the food during delivery, reduce spillage, keep items secure, match the nature of the food, include promised extras, and separate items where necessary.",
      "If poor packaging causes spillage, missing items, damage, or customer dissatisfaction, the Vendor may be responsible for refund or replacement costs.",
    ],
  },
  {
    title: "12. Operating Hours",
    body: [
      "The Vendor should only remain open on MelaChow when the Vendor can receive and prepare orders.",
      "The Vendor should mark the store closed or unavailable when the kitchen is closed, the Vendor cannot fulfil orders, staff are unavailable, ingredients are unavailable, or there is a power, equipment, or operational issue.",
      "If a Vendor repeatedly leaves the store open but fails to fulfil orders, MelaChow may apply warnings or temporary suspension.",
    ],
  },
  {
    title: "13. Current Commission Terms",
    body: [
      "MelaChow currently offers Vendors a launch commission structure.",
      "Current Vendor commission is 0% until the Vendor reaches 50 completed orders on MelaChow.",
      "After the Vendor reaches 50 completed orders, MelaChow may activate a commission of 10% per completed order.",
      "This commission may be deducted automatically from Vendor earnings before payout.",
      "The 50 completed order threshold is calculated per Vendor account or store profile on MelaChow, unless MelaChow agrees otherwise in writing.",
    ],
  },
  {
    title: "14. Future Commission and Fee Changes",
    body: [
      "MelaChow may increase, reduce, introduce, or modify commissions, service fees, subscription fees, promotional fees, or other platform charges in the future.",
      "Where such changes affect the Vendor directly, MelaChow will aim to notify the Vendor by email or another official communication channel at least 3 days before the change takes effect.",
      "If the Vendor continues using the platform after the effective date of the change, the Vendor will be treated as having accepted the updated commercial terms.",
      "If the Vendor does not agree with a new fee or commission structure, the Vendor may request to stop operating on the platform, subject to settlement of outstanding orders, refunds, fees, or disputes.",
      "Any fee already earned by MelaChow before the Vendor stops using the platform remains payable.",
    ],
  },
  {
    title: "15. Customer Service Fee",
    body: [
      "MelaChow may charge customers a service fee on orders placed through the platform.",
      "This customer service fee belongs to MelaChow unless otherwise stated in writing.",
      "The Vendor has no claim to customer service fees charged by the platform.",
    ],
  },
  {
    title: "16. Delivery Fee and Rider Payment",
    body: [
      "MelaChow may arrange delivery through riders or delivery partners.",
      "The customer may be charged a delivery fee depending on location, distance, city settings, or platform rules.",
      "MelaChow may pay riders a fixed or variable delivery amount. Current rider delivery earning may include an amount such as N600 per delivery, depending on platform rules and route conditions.",
      "MelaChow may keep any spread, margin, platform logistics fee, or operational difference between the delivery amount charged and the amount paid out.",
      "The Vendor has no claim to delivery fee margin, customer service fee, logistics spread, promotional fee, or platform fee except where MelaChow expressly agrees in writing.",
    ],
  },
  {
    title: "17. Wallet, Escrow, and Order Settlement",
    body: [
      "Customer payments may be held by MelaChow until the order is completed or confirmed delivered.",
      "Vendor earnings may be credited to the Vendor wallet after order completion, subject to platform commission, refunds, service charges, delivery adjustments, customer complaints, payment provider issues, chargebacks, or reversals.",
      "MelaChow may delay wallet settlement where there is an unresolved issue with the order.",
      "Wallet balances shown on the platform are platform records and may be adjusted to correct refunds, chargebacks, failed transfers, reversed transactions, duplicate credits, fraud reviews, or accounting errors.",
    ],
  },
  {
    title: "18. Vendor Payouts",
    body: [
      "Minimum withdrawal amount is N1,500.",
      "Current payout timing is within 24 hours where there is no unresolved complaint, refund, payment issue, or system delay.",
      "Current vendor automatic payout is targeted around 8:00pm.",
      "MelaChow may later introduce manual withdrawal requests if needed.",
      "If transaction volume grows or the system becomes operationally overloaded, MelaChow may change Vendor payouts to a weekly payout cycle or another reasonable payout schedule.",
      "Payout timelines are subject to bank availability, Paystack or payment provider processing, fraud checks, public holidays, network issues, and unresolved order disputes.",
    ],
  },
  {
    title: "19. Payout Holds",
    body: [
      "MelaChow may hold or delay Vendor payout where a customer requests a refund, there is a food quality complaint, items are missing or incorrect, the order was not delivered successfully, there is suspected fraud, Paystack or bank processing is delayed, there is a chargeback or reversal, or the Vendor account is under review.",
      "Only the affected amount may be held where reasonably possible.",
      "MelaChow will make reasonable efforts to resolve payout holds fairly and quickly.",
    ],
  },
  {
    title: "20. Refund Responsibility",
    body: [
      "Refund responsibility depends on the cause of the issue.",
      "The Vendor may bear the refund cost where the complaint is caused by bad food, spoilt food, missing items, wrong items, incorrect portion, poor packaging, food not matching the menu description, Vendor delay after accepting the order, or Vendor cancellation after accepting the order.",
      "Where a rider delivers late, refund responsibility will be decided case by case depending on what caused the delay.",
      "Where the customer provides a wrong address or changes address after dispatch, the customer may be responsible for any extra delivery cost.",
    ],
  },
  {
    title: "21. Customer Complaints",
    body: [
      "MelaChow may review complaints from customers using order details, Vendor preparation timeline, rider delivery timeline, customer messages, photos or evidence submitted, platform logs, and payment records.",
      "MelaChow may issue a full refund, partial refund, wallet credit, replacement request, or no refund, depending on the facts.",
      "Where MelaChow issues a refund because of Vendor fault, the refund may be deducted from the Vendor wallet or future payout.",
      "The Vendor must cooperate with complaint reviews by providing clear information, order details, photos, preparation updates, or other reasonable evidence requested by MelaChow.",
      "If the Vendor does not respond within a reasonable time, MelaChow may decide the matter using the information available.",
    ],
  },
  {
    title: "22. Chargebacks and Payment Reversals",
    body: [
      "If a customer payment is reversed by a bank, card provider, Paystack, or payment processor, MelaChow may deduct the affected amount from the Vendor wallet if the Vendor has already been credited or paid for that order.",
      "If a payout to the Vendor fails or is reversed, MelaChow may attempt to reprocess the payout after the issue is resolved.",
      "The Vendor must ensure bank account details are accurate.",
      "Where a transfer is sent to bank details supplied or confirmed by the Vendor, MelaChow will not be responsible for loss caused by wrong, outdated, or unauthorized bank information provided by the Vendor.",
    ],
  },
  {
    title: "23. Vendor Strike and Suspension Policy",
    body: [
      "A minor strike may be recorded for slow order acceptance, not updating item availability, small packaging complaints, failure to mark order status correctly, or minor menu mismatch.",
      "A serious strike may be recorded for accepting an order and failing to prepare it, repeated missing items, repeated wrong orders, customer refund caused by Vendor fault, poor food handling complaint, abusive communication, or attempting to bypass platform payment.",
      "2 minor strikes within 7 days may lead to a written warning or operational reminder. 3 minor strikes within 7 days may lead to temporary account review or store pause.",
      "2 serious strikes within 14 days may lead to temporary suspension or payout review. 3 serious strikes within 30 days may lead to suspension, removal, or contract termination.",
      "Some issues may lead to immediate suspension without waiting for strikes, especially fraud, safety risk, abuse, or serious customer harm.",
      "MelaChow may remove a strike where investigation shows that the Vendor was not at fault.",
    ],
  },
  {
    title: "24. Platform Rights",
    body: [
      "MelaChow may suspend or deactivate Vendor accounts for policy violations, pause a Vendor store during investigation, remove misleading menu items, correct obvious menu or pricing errors, deduct refunds from Vendor wallet where Vendor fault is established, delay payout during unresolved disputes, update platform rules, and introduce new monetization features with notice where required.",
      "These rights are necessary to protect customers, Vendors, riders, payment integrity, brand reputation, and normal platform operations.",
    ],
  },
  {
    title: "25. Future Monetization Options",
    body: [
      "MelaChow may introduce optional or required monetization features including Vendor commission, featured restaurant placement, sponsored menu items, Vendor subscription plans, premium analytics and reporting, packaging fees, promotional campaign fees, cancellation or no-show penalties, service upgrades, and delivery or logistics-related charges.",
      "Optional services will generally require Vendor agreement before activation. Platform-wide fees or required commercial changes may be introduced with notice.",
    ],
  },
  {
    title: "26. Featured Placement and Promotions",
    body: [
      "MelaChow may offer Vendors the option to pay for featured restaurant placement, sponsored menu visibility, promotional banners, campaign participation, discount campaigns, and special listing positions.",
      "The cost, duration, placement, and expected benefit of such promotion should be agreed before activation.",
      "MelaChow does not guarantee a fixed number of sales from promotions unless expressly agreed in writing.",
    ],
  },
  {
    title: "27. Vendor Subscription and Premium Reporting",
    body: [
      "MelaChow may later offer subscription plans or premium reporting tools.",
      "These may include sales reports, customer insights, menu performance data, order trend analysis, priority support, and marketing support.",
      "Such services may be free, paid, or limited by plan.",
    ],
  },
  {
    title: "28. Cancellation and No-Show Penalties",
    body: [
      "MelaChow may introduce penalties for repeated Vendor cancellations, no-shows, or failure to fulfil accepted orders.",
      "Penalties may include warning, temporary store pause, lower visibility, refund deduction, cancellation fee, or suspension.",
      "MelaChow will consider the reason for cancellation before applying penalties.",
    ],
  },
  {
    title: "29. Data and Customer Information",
    body: [
      "The Vendor may receive customer information only for fulfilling orders.",
      "Customer information may include customer name, phone number, delivery address, order details, and delivery instructions.",
      "The Vendor must not sell customer data, use customer data for unrelated marketing, contact customers outside order fulfilment unless necessary, share customer information with unauthorized persons, or store customer data longer than needed.",
      "The Vendor must notify MelaChow immediately if customer information is lost, exposed, misused, sent to the wrong person, or accessed by an unauthorized person.",
    ],
  },
  {
    title: "30. Data Processing Position",
    body: [
      "MelaChow collects, stores, and processes customer and order data through the platform.",
      "The Vendor receives only the customer information needed to prepare or fulfil orders.",
      "Both parties must protect customer information from misuse or unauthorized access.",
      "The Vendor agrees that customer order data must not be used to move customers away from MelaChow, bypass platform payments, or run unauthorized direct marketing.",
      "Where a separate Data Processing Agreement is later required, the Vendor agrees to review and sign it as part of continued platform participation.",
    ],
  },
  {
    title: "31. Food Safety and Regulatory Compliance",
    body: [
      "Food safety, hygiene declarations, kitchen inspection rights, and regulatory food permits will be handled under a separate policy or addendum when introduced.",
      "Until such policy is issued, the Vendor remains responsible for complying with all laws, regulations, health standards, and business requirements that apply to the Vendor's food business.",
      "The Vendor is responsible for the safety, freshness, handling, preparation, packaging, and quality of all food supplied through MelaChow.",
    ],
  },
  {
    title: "32. Limitation of Liability",
    body: [
      "MelaChow provides a technology platform for ordering, payment coordination, logistics coordination, wallet tracking, vendor management, and related services.",
      "The Vendor remains responsible for food preparation, food quality, menu accuracy, packaging, kitchen operations, staff conduct, Vendor-side delays, and compliance with applicable food business laws.",
      "MelaChow will not be responsible for losses caused by the Vendor's failure to prepare food properly, package orders correctly, or comply with applicable business obligations.",
      "To the fullest extent allowed by law, MelaChow will not be liable for indirect loss, loss of profit, loss of goodwill, business interruption, or customer complaints caused by Vendor action, Vendor delay, food quality, wrong menu information, or poor packaging.",
    ],
  },
  {
    title: "33. Indemnity",
    body: [
      "The Vendor agrees to protect and hold MelaChow and SamkaTech Limited harmless from claims, losses, complaints, penalties, refunds, damages, or expenses caused by bad or unsafe food, wrong food, missing items, Vendor staff misconduct, false business information, violation of customer data rules, Vendor breach of this agreement, Vendor failure to comply with applicable laws, or claims arising from Vendor food preparation, food quality, food handling, or packaging.",
    ],
  },
  {
    title: "34. Termination",
    body: [
      "Either party may end this relationship by giving 7 days' written notice, unless immediate termination or suspension is allowed under this agreement.",
      "MelaChow may terminate or suspend the Vendor immediately where there is fraud, serious customer harm, repeated operational failure, abuse of customers, riders, or platform staff, attempt to bypass platform payment, serious breach, or refusal to cooperate with a serious complaint, refund review, or payment investigation.",
      "Upon termination, pending orders must be completed or cancelled properly, customer complaints must be resolved, refunds and deductions may be applied, remaining valid Vendor wallet balance may be paid after settlement review, and Vendor dashboard access may be restricted or removed.",
    ],
  },
  {
    title: "35. Offboarding and Wallet Balance",
    body: [
      "If a Vendor leaves the platform, MelaChow will review the Vendor account before final settlement.",
      "MelaChow may deduct refunds, chargebacks, failed order costs, outstanding fees, penalties already due, and payment reversal amounts.",
      "After deductions, any valid remaining Vendor balance may be paid to the verified Vendor bank account.",
      "MelaChow may withhold final payout until all pending orders, complaints, refunds, chargebacks, and payment reversals are reasonably reviewed.",
    ],
  },
  {
    title: "36. Governing Law",
    body: [
      "This agreement is governed by MelaChow’s internal policies, operating standards, and the applicable terms accepted by Vendors when using the platform.",
      "Where a dispute arises, MelaChow and the Vendor will first attempt to resolve the matter through good-faith communication and internal dispute resolution procedures before considering any further action permitted under applicable law.",
    ],
  },
  {
    title: "37. Notices, Relationship, and Entire Agreement",
    body: [
      "Official notices and platform updates may be sent by email, Vendor dashboard notice, SMS, phone call, WhatsApp or other official business communication channel, or written letter where necessary.",
      "Messages sent to the email address, phone number, or dashboard account provided by the Vendor will be treated as received unless the Vendor previously notified MelaChow of a change.",
      "Nothing in this agreement makes the Vendor an employee, agent, partner, or legal representative of SamkaTech Limited or MelaChow.",
      "The Vendor operates an independent food business. MelaChow provides platform, payment coordination, logistics coordination, and related technology services.",
      "This document, digital terms accepted during registration, platform rules, payout policies, refund policies, and any written addendum agreed by both parties form the full agreement between MelaChow and the Vendor.",
      "If any part of this agreement is found invalid or unenforceable, the remaining parts will continue to apply.",
    ],
  },
  {
    title: "38. Updates to This Agreement",
    body: [
      "MelaChow may update this agreement as the platform grows.",
      "Updates may be needed because of new payment systems, new payout rules, new monetization features, regulatory changes, operational changes, delivery model changes, or customer protection improvements.",
      "MelaChow will make reasonable efforts to notify Vendors of important changes.",
      "Continued use of the platform after notice may mean the Vendor accepts the updated terms.",
    ],
  },
];

export default function VendorTermsAndPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <section className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <Link
            href="/vendors/auth/register"
            className="mb-8 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-600 shadow-sm transition hover:text-orange-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <ArrowLeft size={15} />
            Back to registration
          </Link>

          <div className="grid gap-8 lg:grid-cols-[1fr_260px] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                <ShieldCheck size={15} />
                Version {termsVersion}
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                MelaChow Vendor Terms and Policy
              </h1>
              <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-zinc-600 dark:text-zinc-300">
                These are the full Vendor terms for restaurants and food businesses operating on MelaChow, a platform operated by SamkaTech Limited.
              </p>
            </div>

            <div className="rounded-[28px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Support</p>
              <p className="mt-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">abdulquadrimahmud06@gmail.com</p>
              <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">09134831368</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-5 py-8 md:grid-cols-3">
        {[
          { icon: Store, label: "Commission", value: "0% until 50 orders, then 10%" },
          { icon: CreditCard, label: "Payout", value: "Riders 7:30pm, vendors 8:00pm where eligible" },
          { icon: BadgeCheck, label: "Acceptance", value: "Required before registration can be submitted" },
        ].map((item) => (
          <div key={item.label} className="rounded-[24px] border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <item.icon className="text-orange-600" size={24} />
            <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-zinc-400">{item.label}</p>
            <p className="mt-2 text-sm font-bold leading-6 text-zinc-800 dark:text-zinc-200">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-14">
        <div className="space-y-5">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[28px] border border-zinc-100 p-6 dark:border-zinc-800">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-sm font-black text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                  <FileText size={16} />
                </span>
                <h2 className="text-xl font-black tracking-tight">{section.title}</h2>
              </div>
              <div className="space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm font-medium leading-7 text-zinc-600 dark:text-zinc-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-[28px] border border-orange-200 bg-orange-50 p-6 dark:border-orange-500/30 dark:bg-orange-500/10">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 shrink-0 text-orange-700 dark:text-orange-300" size={22} />
            <p className="text-sm font-bold leading-7 text-orange-950 dark:text-orange-100">
              By ticking the acceptance box during registration, you confirm that you have read, understood, and agreed to these terms and policies. MelaChow stores the acceptance date, terms version, and request information as proof of acceptance.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
