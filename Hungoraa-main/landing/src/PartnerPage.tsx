import Navbar from './components/Navbar'
import PartnerWithUs from './components/PartnerWithUs'
import AppDownload from './components/AppDownload'
import Footer from './components/Footer'

export default function PartnerPage() {
  return (
    <>
      <Navbar onHome={false} />
      <main>
        <PartnerWithUs />
        <AppDownload />
      </main>
      <Footer onHome={false} />
    </>
  )
}
