import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <h1>Welcom to Escrow Service</h1>
      <div className="buttons">
        <button onClick={() => navigate('/buyer')}>I'm Buyer</button>
        <button onClick={() => navigate('/seller')}>I'm Seller</button>
      </div>
    </div>
  );
}

export default HomePage;

