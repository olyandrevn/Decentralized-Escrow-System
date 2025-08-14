import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import BuyerPage from './BuyerPage';
import SellerPage from './SellerPage';
import HomePage from './HomePage';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav>
          <Link to="/">Home</Link>
          <Link to="/buyer">Buyer</Link>
          <Link to="/seller">Seller</Link>
        </nav>
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/buyer" element={<BuyerPage />} />
          <Route path="/seller" element={<SellerPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;