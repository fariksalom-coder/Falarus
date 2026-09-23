import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '../index.css';
import { SalesCrmAuthProvider } from './auth';
import SalesCrmApp from './App';

const basename = window.location.pathname.startsWith('/crm') ? '/crm' : '/';

createRoot(document.getElementById('sales-crm-root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <SalesCrmAuthProvider>
        <SalesCrmApp />
      </SalesCrmAuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
