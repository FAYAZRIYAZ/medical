import { Link } from 'react-router-dom';
import { Heart, Shield, Clock, Award, Phone, MapPin, Mail, ChevronRight, Stethoscope, BedDouble, FlaskConical, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const services = [
  { icon: Stethoscope, title: 'OPD & Consultations', desc: 'Expert consultations with experienced specialists across all departments' },
  { icon: BedDouble, title: 'In-Patient Care (IPD)', desc: 'Comprehensive in-patient care with modern facilities and 24/7 monitoring' },
  { icon: FlaskConical, title: 'Diagnostics & Lab', desc: 'State-of-the-art laboratory and imaging services with fast turnaround' },
  { icon: Video, title: 'Telemedicine', desc: 'Consult with doctors from the comfort of your home via video call' },
];

const stats = [
  { value: '500+', label: 'Beds' },
  { value: '200+', label: 'Doctors' },
  { value: '50K+', label: 'Patients Served' },
  { value: '25+', label: 'Specialties' },
];

const doctors = [
  { name: 'Dr. Arjun Mehta', specialty: 'Cardiology', exp: '15 years', img: null },
  { name: 'Dr. Priya Sharma', specialty: 'Pediatrics', exp: '12 years', img: null },
  { name: 'Dr. Rahul Verma', specialty: 'Orthopedics', exp: '10 years', img: null },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-medical-blue text-white font-bold">H</div>
              <span className="text-xl font-bold text-gray-900">HIMS</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#services" className="text-sm text-gray-600 hover:text-medical-blue">Services</a>
              <a href="#doctors" className="text-sm text-gray-600 hover:text-medical-blue">Doctors</a>
              <a href="#contact" className="text-sm text-gray-600 hover:text-medical-blue">Contact</a>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth/login">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth/login-otp">
                <Button size="sm" className="bg-medical-blue hover:bg-medical-blue/90">Patient Portal</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 py-24 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-teal-300 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Your Health, Our Priority
          </h1>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            City General Hospital — delivering world-class healthcare with compassion and cutting-edge technology.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/auth/login-otp">
              <Button size="lg" className="bg-white text-medical-blue hover:bg-blue-50 gap-2">
                Book Appointment <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#services">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Our Services
              </Button>
            </a>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-blue-200 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Our Services</h2>
            <p className="text-gray-600 mt-3 max-w-xl mx-auto">Comprehensive healthcare services for every stage of life</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((svc) => (
              <Card key={svc.title} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-medical-blue/10 text-medical-blue">
                    <svc.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{svc.title}</h3>
                  <p className="text-sm text-gray-600">{svc.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Choose City General?</h2>
              <div className="space-y-5">
                {[
                  { icon: Heart, title: 'Patient-Centered Care', desc: 'Every decision we make prioritizes patient outcomes and comfort.' },
                  { icon: Shield, title: 'Advanced Technology', desc: 'State-of-the-art equipment and digital health records for precise diagnosis.' },
                  { icon: Clock, title: '24/7 Emergency Care', desc: 'Round-the-clock emergency services with rapid response teams.' },
                  { icon: Award, title: 'Accredited Excellence', desc: 'NABH accredited hospital maintaining the highest quality standards.' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-medical-blue/10 text-medical-blue">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-600 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-3xl p-8 text-center">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-2xl bg-medical-blue text-white text-4xl font-bold mb-6">H</div>
              <p className="text-2xl font-bold text-gray-900 mb-2">Hospital Information & Management System</p>
              <p className="text-gray-600 text-sm mb-6">Powered by cutting-edge technology to deliver seamless healthcare experiences</p>
              <Link to="/auth/login-otp">
                <Button className="bg-medical-blue hover:bg-medical-blue/90 w-full">Access Patient Portal</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Doctors */}
      <section id="doctors" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Our Specialists</h2>
            <p className="text-gray-600 mt-3">Meet our team of experienced medical professionals</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <Card key={doc.name} className="hover:shadow-lg transition-shadow overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-medical-blue/20 to-teal-100 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-medical-blue text-white flex items-center justify-center text-2xl font-bold">
                    {(doc.name.split(' ')[1] ?? doc.name).charAt(0)}
                  </div>
                </div>
                <CardContent className="p-5 text-center">
                  <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                  <p className="text-medical-blue text-sm mt-0.5">{doc.specialty}</p>
                  <p className="text-gray-500 text-xs mt-1">{doc.exp} experience</p>
                  <Link to="/auth/login-otp" className="block mt-4">
                    <Button variant="outline" size="sm" className="w-full">Book Appointment</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Contact Us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Phone, label: 'Emergency', value: '+91 1800-123-4567', sub: '24/7 helpline' },
              { icon: MapPin, label: 'Location', value: 'MG Road, Mumbai', sub: 'Maharashtra 400001' },
              { icon: Mail, label: 'Email', value: 'info@citygeneral.in', sub: 'We reply within 24 hrs' },
            ].map((c) => (
              <Card key={c.label}>
                <CardContent className="p-6 flex gap-4 items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-medical-blue/10 text-medical-blue">
                    <c.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="font-semibold text-gray-900">{c.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-medical-blue text-white font-bold text-sm">H</div>
            <span className="text-white font-semibold">HIMS</span>
          </div>
          <p className="text-sm">Hospital Information & Management System</p>
          <p className="text-xs mt-4">© {new Date().getFullYear()} City General Hospital. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
