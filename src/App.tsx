import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';

import { registerContactRouteNavigate } from '@/navigation/contactRouteBridge';

import { WebGLHost } from './WebGLHost';
import { ContactPage } from './ui/contact/ContactPage';

function ContactRouteRegister() {
  const navigate = useNavigate();
  useEffect(() => {
    registerContactRouteNavigate(navigate);
  }, [navigate]);
  return null;
}

function ContactNavExpandSync() {
  const { pathname } = useLocation();
  useEffect(() => {
    const el = document.getElementById('nav-link-contact');
    if (el) {
      el.setAttribute('aria-expanded', pathname === '/contact' ? 'true' : 'false');
    }
  }, [pathname]);
  return null;
}

function ContactPresenceLayer() {
  const { pathname } = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      {pathname === '/contact' && <ContactPage key="inkblot-contact" />}
    </AnimatePresence>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ContactRouteRegister />
      <ContactNavExpandSync />
      <WebGLHost />
      <ContactPresenceLayer />
    </BrowserRouter>
  );
}
