import Navbar from './components/Navbar'
import ServiceModes from './components/ServiceModes'
import Features from './components/Features'
import AppDownload from './components/AppDownload'
import Footer from './components/Footer'

export default function FeaturesPage() {
  return (
    <>
      <Navbar onHome={false} />
      <main>
        <ServiceModes />
        <Features />
        <AppDownload />
      </main>
      <Footer onHome={false} />
    </>
  )
}
