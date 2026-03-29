import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Overview from './pages/Overview';
import Trends from './pages/Trends';
import Categories from './pages/Categories';
import Transactions from './pages/Transactions';
import Import from './pages/Import';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';
import Spreadsheet from './pages/Spreadsheet';
import GmailImport from './pages/GmailImport';
import AmazonImport from './pages/AmazonImport';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/import" element={<Import />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/spreadsheet" element={<Spreadsheet />} />
        <Route path="/gmail" element={<GmailImport />} />
        <Route path="/amazon" element={<AmazonImport />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
