import Navbar from './components/Navbar'
import Contact from './components/Contact'
import AppDownload from './components/AppDownload'
import Footer from './components/Footer'

export default function ContactPage() {
  return (
    <>
      <Navbar onHome={false} />
      <main>
        <Contact />
        <AppDownload />
      </main>
      <Footer onHome={false} />
    </>
  )
}
