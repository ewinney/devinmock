import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { ConsolePage } from './pages/ConsolePage';
import AnalysisReviewPage from './components/AnalysisReviewPage';
import './App.scss';

function App() {
  return (
    <ChakraProvider>
      <Router>
        <div data-component="App">
          <nav>
            <ul>
              <li>
                <Link to="/">Console</Link>
              </li>
              <li>
                <Link to="/analysis">Analysis Review</Link>
              </li>
            </ul>
          </nav>

          <Routes>
            <Route path="/" element={<ConsolePage />} />
            <Route path="/analysis" element={<AnalysisReviewPage />} />
          </Routes>
        </div>
      </Router>
    </ChakraProvider>
  );
}

export default App;
