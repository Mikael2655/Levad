import { LeadForm } from '@/components/LeadForm'
import Link from 'next/link'

const services = [
  {
    id: 'impression',
    icon: '🖨️',
    title: 'Impression',
    desc: 'Imprimantes, photocopieurs et solutions d\'impression professionnelles. Contrats de maintenance, fournitures et gestion de parc.',
  },
  {
    id: 'telephonie',
    icon: '📞',
    title: 'Téléphonie',
    desc: 'Standards téléphoniques, solutions VoIP et téléphonie d\'entreprise. Réduisez vos coûts et améliorez votre communication.',
  },
  {
    id: 'informatique',
    icon: '💻',
    title: 'Informatique & Réseau',
    desc: 'Postes de travail, serveurs, infrastructure réseau. De la conception à l\'installation et la maintenance de votre SI.',
  },
  {
    id: 'ged',
    icon: '📁',
    title: 'GED',
    desc: 'Gestion Électronique de Documents : dématérialisez, archivez et retrouvez vos documents en quelques clics.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-brand-800 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-brand-800 font-black text-lg">L</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">Levad</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#services" className="hover:text-blue-200 transition">Nos solutions</a>
            <a href="#contact" className="hover:text-blue-200 transition">Contact</a>
            <Link href="/crm" className="bg-white text-brand-800 px-4 py-2 rounded-lg hover:bg-blue-50 transition font-semibold">
              Espace CRM
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-800 to-brand-900 text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">
            Équipez votre entreprise avec les solutions <span className="text-blue-300">Levad</span>
          </h1>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Impression, téléphonie, informatique et GED : un partenaire unique pour tous vos besoins technologiques.
          </p>
          <a href="#contact"
            className="inline-block bg-white text-brand-800 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition shadow-lg">
            Demander un devis gratuit
          </a>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Nos domaines d&apos;expertise</h2>
          <p className="text-center text-gray-500 mb-12 text-lg">Des solutions adaptées à chaque besoin de votre entreprise</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map(s => (
              <div key={s.id} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col items-center text-center">
                <div className="text-5xl mb-4">{s.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Levad */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Pourquoi choisir Levad ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🏆', title: 'Expertise reconnue', desc: 'Des années d\'expérience au service des entreprises de toutes tailles.' },
              { icon: '🤝', title: 'Accompagnement sur mesure', desc: 'Un conseiller dédié pour analyser vos besoins et vous proposer la solution idéale.' },
              { icon: '🔧', title: 'Support & Maintenance', desc: 'Un service après-vente réactif pour assurer la continuité de vos opérations.' },
            ].map(item => (
              <div key={item.title} className="text-center p-6">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-20 px-6 bg-brand-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">Contactez-nous</h2>
          <p className="text-center text-gray-500 mb-10">Remplissez ce formulaire et un conseiller vous rappelle sous 24h.</p>
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <LeadForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-black">L</span>
            </div>
            <span className="text-white font-bold text-lg">Levad</span>
          </div>
          <p className="text-sm">Impression · Téléphonie · Informatique & Réseau · GED</p>
          <p className="text-sm">© {new Date().getFullYear()} Levad. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
