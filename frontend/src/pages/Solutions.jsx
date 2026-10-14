import { Link } from 'react-router-dom'
import bimaHimaImage from '../assets/bima-hima.jpg'
import pesaNaPesaImage from '../assets/pesa-na-pesa.jpg'
import PageHero from '../components/PageHero.jsx'
import ProductCards from '../components/ProductCards.jsx'

const officialBase = 'https://www.avlc-group.com/assets/documents/patented-products'

export default function Solutions() {
  return <>
    <PageHero kicker="What we finance" title={<>Solutions for <em>real momentum.</em></>}>
      From urgent personal needs to complex trade cycles, our financing is structured around purpose and repayment capacity.
    </PageHero>
    <section className="section"><div className="wrap"><ProductCards /></div></section>
    <section className="product-showcase" aria-labelledby="featured-products-title">
      <div className="wrap product-showcase-head">
        <p className="kicker">Digital finance products</p>
        <h2 id="featured-products-title">Practical ways to manage <em>essential commitments.</em></h2>
        <p>Two focused AVL Capital products make essential utility payments and insurance premiums easier to manage.</p>
      </div>

      <div className="wrap product-detail" id="pesa-na-pesa">
        <div className="product-visual"><img src={pesaNaPesaImage} alt="Pesa na Pesa product logo" /></div>
        <article>
          <small>MOBILE UTILITY FINANCE</small>
          <h2>Pesa na Pesa</h2>
          <p className="product-lead">A mobile utility-financing service that gives approved customers a small credit limit for essential household bills.</p>
          <p>The service brings together USSD access, CRB-based assessment, M-PESA payments, utility-provider connections, repayment tracking and SMS updates in one journey.</p>
          <div className="product-columns">
            <div><h3>Register and receive a limit</h3><ol>
              <li>Dial <strong>*519*25#</strong> and follow the registration prompts.</li>
              <li>Provide the names and National ID number shown on your ID.</li>
              <li>Accept the CRB check and the applicable terms.</li>
              <li>Pay the registration and credit-assessment charge shown in the current USSD journey through M-PESA.</li>
              <li>Receive an SMS with the registration result and, if approved, your current utility limit.</li>
            </ol></div>
            <div><h3>Use and repay</h3><ol>
              <li>Dial <strong>*519*25#</strong>, choose Borrow, then select the supported utility.</li>
              <li>Select an available provider from the current USSD menu, which may include KPLC, Nairobi Water, DSTV, GOTV, ZUKU or STARTIMES.</li>
              <li>The approved amount is paid directly to the selected provider.</li>
              <li>Repay through Paybill <strong>990390</strong>, using your phone number as the account number.</li>
            </ol></div>
          </div>
          <div className="product-note"><h3>Eligibility and responsible use</h3><p>Applicants must be at least 18 and use a supported mobile network. Customer consent is required before identity and CRB checks. Review the official terms for current charges, repayment dates, interest, overdue penalties, credit reporting, data use and borrowing restrictions. A limit is restored only after full repayment.</p></div>
          <div className="product-actions">
            <Link className="btn" to="/contact">Ask about Pesa na Pesa ↗</Link>
            <a href={`${officialBase}/pesa-na-pesa-terms-and-conditions.pdf`} target="_blank" rel="noreferrer">Read official terms (PDF) ↗</a>
          </div>
        </article>
      </div>

      <div className="wrap product-detail product-detail-reverse" id="bima-hima">
        <div className="product-visual"><img src={bimaHimaImage} alt="Bima Hima product logo" /></div>
        <article>
          <small>INSURANCE PREMIUM FINANCE</small>
          <h2>Bima Hima</h2>
          <p className="product-lead">Insurance premium financing that helps individuals and businesses spread larger cover payments into manageable monthly instalments.</p>
          <p>Bima Hima is designed to make eligible insurance cover more accessible without requiring one large upfront premium payment.</p>
          <div className="benefit-list">
            <p><b>01</b><span><strong>Flexible repayment</strong>Financing terms of up to four months.</span></p>
            <p><b>02</b><span><strong>Application assessment</strong>Your details and supporting documents are reviewed before an offer is made.</span></p>
            <p><b>03</b><span><strong>Terms before commitment</strong>Eligible policies, deposit, fees, interest, instalment schedule and late-payment consequences are confirmed in the offer and official terms.</span></p>
          </div>
          <p className="responsible-note">Borrow only after reviewing the full cost and confirming that the instalments fit your budget. Eligibility and final terms are subject to assessment.</p>
          <div className="product-actions">
            <Link className="btn" to="/contact">Ask about Bima Hima ↗</Link>
            <a href={`${officialBase}/bima-hima-terms-and-conditions.pdf`} target="_blank" rel="noreferrer">Read official terms (PDF) ↗</a>
          </div>
        </article>
      </div>
    </section>
  </>
}
