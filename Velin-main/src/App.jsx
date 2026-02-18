import React, { useState, useEffect, useRef } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot as onDocSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ThemeProvider, createTheme, CssBaseline, Box, Fade, Snackbar, Alert, useMediaQuery } from '@mui/material';
import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import MapIcon from '@mui/icons-material/Map';
import BookIcon from '@mui/icons-material/Book';
import FeedbackIcon from '@mui/icons-material/Feedback';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LockIcon from '@mui/icons-material/Lock';
import './App.css';

import RelationshipHeartGLTF3D from './RelationshipHeartGLTF3D.jsx';
import { velinReview, conversationPrompt } from './geminiMock';
import { addXP, calculateLevel } from './xpLogic';
// ...existing code...
import { getPublicDataPath } from './velinDataPaths';
// Module placeholders
// ...existing code...
function Dashboard({ showToast }) {
  const [xp, setXP] = useState(0);
  const [burst, setBurst] = useState(false);
    // Heart-Flower: use healthScore as alignmentScore, level as velinTier
    useEffect(() => {
      if (xp > 0) {
        setBurst(true);
        const t = setTimeout(() => setBurst(false), 900);
        return () => clearTimeout(t);
      }
    }, [xp]);
  const [goals, setGoals] = useState([]);
  const [goalInput, setGoalInput] = useState("");
  const [review, setReview] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [journal, setJournal] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false); // DEBUG: force loading off
  const [healthScore, setHealthScore] = useState(78); // Mocked health score
  const [insightLoading, setInsightLoading] = useState(false);
  const timeoutRef = useRef();
  const appId = "velin-demo";
  const xpDocRef = doc(db, getPublicDataPath(appId) + "/xp", "shared");
  const level = calculateLevel(xp);
  const userId = auth.currentUser?.uid || "-";

  // Real-time Firestore sync for goals
  useEffect(() => {
    const q = query(collection(db, getPublicDataPath(appId) + "/goals"), orderBy("created", "desc"));
    const unsub = onSnapshot(q, snap => {
      setGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  // Real-time Firestore sync for journal and feedbacks (for AI)
  useEffect(() => {
    const jq = query(collection(db, getPublicDataPath(appId) + "/journal"), orderBy("created", "desc"));
    const fq = query(collection(db, getPublicDataPath(appId) + "/feedback"), orderBy("created", "desc"));
    const unsubJ = onSnapshot(jq, snap => {
      setJournal(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubF = onSnapshot(fq, snap => {
      setFeedbacks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubJ(); unsubF(); };
  }, []);

  // Real-time XP sync (commented out for manual slider demo)
  // useEffect(() => {
  //   const unsub = onDocSnapshot(xpDocRef, (docSnap) => {
  //     if (docSnap.exists()) setXP(docSnap.data().xp || 0);
  //   });
  //   return unsub;
  // }, []);

  // AI Velin Review and prompt

  useEffect(() => {
    async function runReview() {
      setLoading(true);
      if (journal.length === 0 && feedbacks.length === 0) {
        setLoading(false);
        return;
      }
      const reviewResult = await velinReview(journal, []); // Love acts not implemented yet
      setReview(reviewResult);
      const promptResult = await conversationPrompt({ journal, feedbacks });
      setPrompt(promptResult);
      setLoading(false);
    }
    runReview();
  }, [journal, feedbacks]);

  // Mock actionable insight fetch
  const handleGenerateInsight = async () => {
    setInsightLoading(true);
    const { getActionableInsight } = await import('./geminiMock');
    const insightText = await getActionableInsight(`XP: ${xp}, Health: ${healthScore}`);
    setInsight(insightText);
    setInsightLoading(false);
  };

  // Initial fetch for actionable insight
  useEffect(() => {
    handleGenerateInsight();
    // eslint-disable-next-line
  }, [xp, healthScore]);

  // Progress to next level
  const xpForLevel = 100;
  const currentLevelXP = Math.max(0, Math.min(xp, xpForLevel));
  const progress = currentLevelXP / xpForLevel;

  // Add goal handler (unchanged)
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!goalInput.trim()) return;
    try {
      await addDoc(collection(db, getPublicDataPath(appId) + "/goals"), {
        text: goalInput,
        created: Date.now(),
      });
      setGoalInput("");
      // Atomically update XP in Firestore
      const xpSnap = await getDoc(xpDocRef);
      const newXP = addXP(xpSnap.exists() ? xpSnap.data().xp : 0, 'goal');
      if (xpSnap.exists()) {
        await updateDoc(xpDocRef, { xp: newXP });
      } else {
        await setDoc(xpDocRef, { xp: newXP });
      }
      setBurst(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setBurst(false), 900);
      showToast('Goal added!', 'success');
    } catch (err) {
      showToast('Failed to add goal', 'error');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, width: '100%' }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 16, animation: 'spin 1.2s linear infinite' }}>
          <circle cx="32" cy="32" r="28" stroke="#a18cd1" strokeWidth="8" strokeDasharray="44 88" strokeLinecap="round" />
        </svg>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#7f53ac' }}>Loading your Growth Hub...</div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="velin-main-content">
      {/* TEMP: XP Slider for demo/testing */}
      <div style={{ width: '100%', maxWidth: 400, margin: '16px auto 0', padding: 12, background: '#f8fafc', borderRadius: 16, boxShadow: '0 2px 12px #b71c1c10', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <label htmlFor="xp-slider" style={{ fontWeight: 700, color: '#7f53ac', fontSize: 16 }}>Adjust XP (Demo, 0-100)</label>
        <input
          id="xp-slider"
          type="range"
          min={0}
          max={xpForLevel}
          value={xp}
          onChange={e => setXP(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <span style={{ fontWeight: 600, color: '#b71c1c', fontSize: 15 }}>XP: {xp} / {xpForLevel}</span>
      </div>
      {/* Header */}
      <div style={{ textAlign: 'center', margin: '12px 0 18px 0' }}>
        <h1 style={{ fontFamily: 'Inter, Roboto, Arial, sans-serif', fontWeight: 800, fontSize: 28, color: '#3f2778', letterSpacing: 0.5, margin: 0 }}>Velin: Your Growth Hub</h1>
      </div>

      {/* Unified XP + Heart Card */}
      <div className="velin-card velin-card-metrics" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: 0, marginBottom: 24 }}>
        <div style={{ width: 112, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {/* Heart 3D perfectly centered, bright red, with gold glow */}
          <div style={{ width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <RelationshipHeartGLTF3D xpLevel={Math.round(progress * 100)} stable tightRing brightRed noCylinder />
          </div>
          {/* Modern XP progress bar */}
          <div style={{ width: 96, margin: '12px auto 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 6, background: 'linear-gradient(90deg, #FFD600 0%, #ff69b4 100%)', boxShadow: '0 1px 6px #FFD60044' }}>
              <div style={{ width: `${Math.round(progress * 100)}%`, height: '100%', borderRadius: 6, background: 'linear-gradient(90deg, #FFD600 0%, #ff69b4 100%)', transition: 'width 0.5s cubic-bezier(.7,0,.3,1)' }}></div>
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#FFD600', minWidth: 28, textAlign: 'right', textShadow: '0 1px 6px #FFD60088' }}>{Math.round(progress * 100)}</span>
          </div>
        </div>
        {/* Level Badge */}
        <div className="velin-level-badge-row" style={{ marginTop: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#7f53ac', background: '#f3e1ff', borderRadius: 12, padding: '4px 16px' }}>Level {level}</span>
          <span style={{ fontWeight: 500, fontSize: 15, color: '#657ced' }}>{getLevelTitle(level)}</span>
        </div>
      </div>

      {/* AI Actionable Insight Card */}
      <div className="velin-card velin-card-insight">
        <div className="velin-insight-row">
          <span style={{ fontWeight: 700, color: '#FFD600', fontSize: 18 }}>AI Insight</span>
          <button onClick={handleGenerateInsight} disabled={insightLoading} className="velin-btn-blue" style={{ fontSize: 15, padding: '6px 16px', borderRadius: 12, marginLeft: 'auto', minWidth: 0 }}>{insightLoading ? '...' : 'Generate Fresh Insight'}</button>
        </div>
        <div className="velin-insight-text">{insight}</div>
      </div>

      {/* Velin Review Summary (teaser) */}
      {review && (
        <div className="velin-card velin-card-review">
          <div className="velin-review-title">Velin Review</div>
          <div className="velin-review-summary">{review.summary}</div>
          <div className="velin-review-recommendation">{review.recommendation}</div>
        </div>
      )}

      {/* Personalized Prompt */}
      {prompt && (
        <div className="velin-card" style={{ border: 'none', borderLeft: '6px solid #43b581', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontWeight: 700, color: '#43b581', marginBottom: 2 }}>Conversation Starter</div>
          <input type="text" value={prompt} readOnly style={{ fontWeight: 500, fontSize: 15, color: '#2d1a4d', background: '#f8fafc', border: 'none', outline: 'none', width: '100%', borderRadius: 10, padding: '8px 10px', marginTop: 2 }} onFocus={e => e.target.select()} />
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 14, margin: '0 0 18px 0', justifyContent: 'center' }}>
        <button onClick={handleAddGoal} className="velin-btn-blue" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, padding: '10px 18px', borderRadius: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>+</span> Log Goal
        </button>
        <button onClick={() => showToast('Quick Journal coming soon!', 'info')} className="velin-btn-blue" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, padding: '10px 18px', borderRadius: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>+</span> Quick Journal
        </button>
      </div>

      {/* Goal Input (hidden, used by quick action) */}
      <form onSubmit={handleAddGoal} style={{ display: 'none' }} aria-label="Add goal form" role="form">
        <input value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder="Add a new goal..." aria-label="Goal input" />
      </form>

      {/* Partner ID Display */}
      <div style={{ margin: '32px 0 0 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#f8fafc', border: '1.5px solid #e0c3fc', borderRadius: 12, padding: '8px 18px', fontFamily: 'monospace', fontSize: 14, color: '#7f53ac', letterSpacing: 0.5, fontWeight: 600 }}>
          Partner ID: {userId}
        </div>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Share this ID with your partner to connect your Velin accounts.</div>
      </div>

      {/* XP Burst Animation */}
      {burst && (
        <div style={{ position: 'fixed', left: '50%', top: 120, transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 10 }}>
          <XPBurst />
        </div>
      )}
    </div>
  );
}

// Helper: Level title
function getLevelTitle(level) {
  const titles = [
    'Aligned Explorers',
    'Growth Partners',
    'Resilient Allies',
    'Empowered Team',
    'Radiant Duo',
    'Synergy Seekers',
    'Harmonic Builders',
    'Visionary Pair',
    'Legacy Makers',
    'Infinite Journey',
  ];

  return titles[(level - 1) % titles.length];
}

function XPBurst() {
  // Simple animated burst (CSS)
  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute', left: 60, top: 60, width: 12, height: 12, borderRadius: '50%', background: '#FFD600',
          transform: `rotate(${i * 30}deg) translateY(-48px)`, opacity: 0.8,
          animation: 'xp-burst 0.9s cubic-bezier(.7,0,.3,1)'
        }} />
      ))}
      <div style={{
        position: 'absolute', left: 36, top: 36, width: 48, height: 48, borderRadius: '50%', background: '#FFF176',
        boxShadow: '0 0 32px 8px #FFD60088', opacity: 0.9,
        animation: 'xp-burst-center 0.9s cubic-bezier(.7,0,.3,1)'
      }} />
      <style>{`
        @keyframes xp-burst {
          0% { opacity: 0.8; transform: scale(0.5) translateY(-10px); }
          60% { opacity: 1; transform: scale(1.2) translateY(-48px); }
          100% { opacity: 0; transform: scale(0.8) translateY(-60px); }
        }
        @keyframes xp-burst-center {
          0% { opacity: 0.9; transform: scale(0.5); }
          60% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
function Roadmap() {
  const [goals, setGoals] = useState([]);
  const [archived, setArchived] = useState([]);
  const [goalText, setGoalText] = useState("");
  const [domain, setDomain] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [goalType, setGoalType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [burstGoalId, setBurstGoalId] = useState(null);
  const appId = "velin-demo";
  const xpDocRef = doc(db, getPublicDataPath(appId) + "/xp", "shared");
  const sharedGoalsPath = getPublicDataPath(appId) + "/shared_goals";
  const archivePath = getPublicDataPath(appId) + "/goals_archive";

  // Real-time Firestore sync for shared goals and archive
  useEffect(() => {
    const q = query(collection(db, sharedGoalsPath));
    const unsub = onSnapshot(q, snap => {
      setGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const q2 = query(collection(db, archivePath));
    const unsub2 = onSnapshot(q2, snap => {
      setArchived(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsub(); unsub2(); };
  }, []);

  // Type, domain, and timeframe options
  const TYPE_OPTIONS = [
    { value: "Shared Goal" },
    { value: "Personal Promise" },
  ];
  const DOMAIN_OPTIONS = [
    { value: "Financial Alignment", color: "#43b581" },
    { value: "Academic/Career Support", color: "#7f53ac" },
    { value: "Fun & Adventure", color: "#657ced" },
    { value: "Social/Friendship Network", color: "#e57373" },
    { value: "Physical/Mental Health", color: "#FFD600" },
    { value: "Home/Environment", color: "#00bcd4" },
    { value: "Other", color: "#bdbdbd" },
  ];
  const TIMEFRAME_OPTIONS = [
    { value: "Weekly" },
    { value: "Monthly" },
    { value: "Yearly+" },
  ];
  const XP_BY_HORIZON = {
    "Weekly": 25,
    "Monthly": 75,
    "Yearly+": 250,
  };

  // Add new goal
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goalText.trim() || !domain || !timeframe || !goalType) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, sharedGoalsPath), {
        text: goalText.trim(),
        domain,
        timeframe,
        type: goalType,
        completed: false,
        created: Date.now(),
      });
      setGoalText("");
      setDomain("");
      setTimeframe("");
      setGoalType("");
    } catch {}
    setSubmitting(false);
  };

  // Toggle completion, archive, and award XP
  const handleToggleComplete = async (goal) => {
    if (goal.completed) return;
    const goalRef = doc(db, sharedGoalsPath, goal.id);
    // Archive goal
    await addDoc(collection(db, archivePath), {
      ...goal,
      completed: true,
      completedAt: Date.now(),
    });
    await deleteDoc(goalRef);
    // XP logic by horizon
    const xpSnap = await getDoc(xpDocRef);
    const xpAward = XP_BY_HORIZON[goal.timeframe] || 25;
    const newXP = (xpSnap.exists() ? xpSnap.data().xp : 0) + xpAward;
    if (xpSnap.exists()) {
      await updateDoc(xpDocRef, { xp: newXP });
    } else {
      await setDoc(xpDocRef, { xp: newXP });
    }
    setBurstGoalId(goal.id);
    setTimeout(() => setBurstGoalId(null), 1200);
  };

  // Group and sort goals by timeframe
  const grouped = {};
  for (const tf of TIMEFRAME_OPTIONS.map(o => o.value)) {
    grouped[tf] = [];
  }
  for (const g of goals) {
    if (grouped[g.timeframe]) grouped[g.timeframe].push(g);
  }
  for (const tf in grouped) {
    grouped[tf] = grouped[tf]
      .sort((a, b) => a.created - b.created);
  }

  // Helper: get domain color
  const getDomainColor = (domain) => {
    return DOMAIN_OPTIONS.find(d => d.value === domain)?.color || '#bdbdbd';
  };

  return (
    <div className="velin-roadmap-bg-responsive" style={{
      width: '100%',
      margin: '0 auto',
      padding: '0 0 24px 0',
      position: 'relative',
      minHeight: '100vh',
      borderRadius: 24,
      boxShadow: '0 0 32px #0fffcf10',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', margin: '12px 0 18px 0' }}>
        <h1 style={{ fontFamily: 'Inter, Roboto, Arial, sans-serif', fontWeight: 800, fontSize: 28, color: '#f3f3f3', letterSpacing: 0.5, margin: 0, textShadow: '0 2px 16px #0fffcf40' }}>Velin Roadmap</h1>
        <div style={{ color: '#bdbdbd', fontSize: 16, marginTop: 4, fontStyle: 'italic' }}>Transform promises into Integrity Capital. Complete goals to grow your shared world.</div>
      </div>

      {/* Instructional Box */}
      <div className="velin-card" style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(60,20,30,0.82)', border: '1.5px solid #a94442', boxShadow: '0 0 16px #a9444210' }}>
        <div style={{ fontWeight: 700, color: '#3f8efc', fontSize: 18, marginBottom: 2, fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.2 }}>The Vow: Make a Commitment</div>
        <div style={{ fontSize: 15, color: '#f4f4f4', fontFamily: 'Inter, Roboto, Arial, sans-serif' }}>Choose a type, horizon, and describe what "Done" looks like. Completion awards XP and archives your promise forever.</div>
      </div>

      {/* Goal Submission Form */}
      <form className="velin-card" style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'stretch', background: 'rgba(60,20,30,0.82)', boxShadow: '0 2px 12px #ffb6c120', border: '1.5px solid #a94442' }} onSubmit={handleSubmit}>
        <label style={{ fontWeight: 700, color: '#ffb6c1', fontSize: 16, marginBottom: 2, fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.2 }}>Description</label>
        <textarea
          rows={4}
          value={goalText}
          onChange={e => setGoalText(e.target.value)}
          placeholder="Describe your promise or goal (e.g., 'Plan a date night every Friday')"
          required
          className="velin-textarea"
          style={{ resize: 'vertical', minHeight: 64, maxHeight: 160, background: 'rgba(40,20,30,0.92)', color: '#f4f4f4', border: '1.5px solid #a94442', borderRadius: 14, fontSize: 16, padding: 14, fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.1, boxShadow: '0 1px 8px #ffb6c120', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 700, color: '#ffb6c1', fontSize: 15, fontFamily: 'Inter, Roboto, Arial, sans-serif' }}>Type</label>
            <select value={goalType} onChange={e => setGoalType(e.target.value)} required className="velin-input" style={{ width: '100%', marginTop: 2, background: 'rgba(40,20,30,0.92)', color: '#f4f4f4', border: '1.5px solid #a94442', borderRadius: 12, fontSize: 15, fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.1, boxShadow: '0 1px 8px #ffb6c120', outline: 'none' }}>
              <option value="" disabled>Select type</option>
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.value}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 700, color: '#ffb6c1', fontSize: 15, fontFamily: 'Inter, Roboto, Arial, sans-serif' }}>Domain</label>
            <select value={domain} onChange={e => setDomain(e.target.value)} required className="velin-input" style={{ width: '100%', marginTop: 2, background: 'rgba(40,20,30,0.92)', color: '#f4f4f4', border: '1.5px solid #a94442', borderRadius: 12, fontSize: 15, fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.1, boxShadow: '0 1px 8px #ffb6c120', outline: 'none' }}>
              <option value="" disabled>Select domain</option>
              {DOMAIN_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} style={{ color: '#a94442', background: '#ffb6c1' }}>{opt.value}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 700, color: '#ffb6c1', fontSize: 15, fontFamily: 'Inter, Roboto, Arial, sans-serif' }}>Horizon</label>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)} required className="velin-input" style={{ width: '100%', marginTop: 2, background: 'rgba(40,20,30,0.92)', color: '#f4f4f4', border: '1.5px solid #a94442', borderRadius: 12, fontSize: 15, fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.1, boxShadow: '0 1px 8px #ffb6c120', outline: 'none' }}>
              <option value="" disabled>Select horizon</option>
              {TIMEFRAME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.value}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={!goalText.trim() || !domain || !timeframe || !goalType || submitting} className="velin-btn" style={{ marginTop: 8, fontSize: 17, padding: '12px 0', borderRadius: 16, background: 'linear-gradient(90deg,#3f8efc,#7f53ac)', color: '#fff', fontWeight: 700, border: 'none', boxShadow: '0 2px 12px #3f8efc80', opacity: (!goalText.trim() || !domain || !timeframe || !goalType || submitting) ? 0.7 : 1, textShadow: '0 2px 8px #3f8efc80', fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.1 }}>Commit</button>
      </form>

      {/* Grouped Goals by Horizon */}
      {TIMEFRAME_OPTIONS.map(tf => (
        <div key={tf.value} style={{ marginBottom: 22 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#f3f3f3', margin: '0 0 8px 2px', textShadow: '0 2px 8px #0fffcf40' }}>{tf.value} ({grouped[tf.value].length} active)</div>
          {grouped[tf.value].length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 15, margin: '0 0 8px 8px' }}>No commitments yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grouped[tf.value].map(goal => (
                <div key={goal.id} className="velin-card" style={{
                  display: 'flex', alignItems: 'center', gap: 12, background: '#232323', boxShadow: '0 1px 8px #0fffcf40', position: 'relative', borderLeft: `6px solid ${goalType === 'Personal Promise' ? '#ffb6c1' : '#3f8efc'}`,
                  color: '#f3f3f3', borderRadius: 18, animation: burstGoalId === goal.id ? 'pulse 1.2s' : undefined, transition: 'background 0.2s, opacity 0.2s', opacity: 1 }}>
                  {/* Completion Checkbox */}
                  <div onClick={() => handleToggleComplete(goal)} style={{ cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: `2.5px solid #3f8efc`, background: '#121212', marginRight: 2, transition: 'border 0.2s, background 0.2s' }}>
                    <svg width="22" height="22" viewBox="0 0 22 22"><rect x="4" y="4" width="14" height="14" rx="4" fill="none" stroke="#232e2b" strokeWidth="2.5" /></svg>
                  </div>
                  {/* Goal Text */}
                  <div style={{ flex: 1, fontSize: 16, color: '#f3f3f3', fontWeight: 500 }}>{goal.text}</div>
                  {/* Type Tag */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: goal.type === 'Personal Promise' ? '#ffb6c1' : '#3f8efc', background: '#121212', borderRadius: 10, padding: '4px 10px', marginLeft: 2, border: `1.5px solid ${goal.type === 'Personal Promise' ? '#ffb6c1' : '#3f8efc'}`, boxShadow: '0 0 8px #3f8efc80' }}>{goal.type}</div>
                  {/* Domain Tag */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: getDomainColor(goal.domain), background: '#121212', borderRadius: 10, padding: '4px 10px', marginLeft: 2, border: `1.5px solid ${getDomainColor(goal.domain)}`, boxShadow: '0 0 8px ' + getDomainColor(goal.domain) + '80' }}>{goal.domain}</div>
                  {/* Delete Button */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this commitment?')) {
                        const goalRef = doc(db, sharedGoalsPath, goal.id);
                        await deleteDoc(goalRef);
                      }
                    }}
                    aria-label="Delete goal"
                    style={{
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      cursor: 'pointer',
                      marginLeft: 4,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      transition: 'background 0.2s',
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 22 22" style={{ display: 'block' }}>
                      <circle cx="11" cy="11" r="10" fill="#fff0" />
                      <path d="M7 7L15 15M15 7L7 15" stroke="#ff3576" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                  {/* XP Burst Animation */}
                  {burstGoalId === goal.id && (
                    <div style={{ position: 'absolute', left: '50%', top: -18, transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 10 }}>
                      <XPBurst />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Integrity Ledger / Archive */}
      <div style={{ marginTop: 36 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#f3f3f3', margin: '0 0 8px 2px', textShadow: '0 2px 8px #0fffcf40' }}>Integrity Ledger (Archive)</div>
        {archived.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: 15, margin: '0 0 8px 8px' }}>No completed commitments yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {archived.sort((a, b) => b.completedAt - a.completedAt).map(goal => (
              <div key={goal.id} className="velin-card" style={{
                display: 'flex', alignItems: 'center', gap: 12, background: '#1a2420', opacity: 0.8, boxShadow: '0 1px 4px #0fffcf40', position: 'relative', borderLeft: `6px solid ${goal.type === 'Personal Promise' ? '#ffb6c1' : '#3f8efc'}`,
                color: '#bdbdbd', borderRadius: 18, textDecoration: 'line-through', fontStyle: 'italic', fontWeight: 500 }}>
                <svg width="22" height="22" viewBox="0 0 22 22"><polyline points="4,12 10,18 18,6" style={{ fill: 'none', stroke: '#0fffcf', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }} /></svg>
                <div style={{ flex: 1 }}>{goal.text}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: goal.type === 'Personal Promise' ? '#ffb6c1' : '#3f8efc', background: '#121212', borderRadius: 10, padding: '4px 10px', marginLeft: 2, border: `1.5px solid ${goal.type === 'Personal Promise' ? '#ffb6c1' : '#3f8efc'}`, boxShadow: '0 0 8px #3f8efc80' }}>{goal.type}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: getDomainColor(goal.domain), background: '#121212', borderRadius: 10, padding: '4px 10px', marginLeft: 2, border: `1.5px solid ${getDomainColor(goal.domain)}`, boxShadow: '0 0 8px ' + getDomainColor(goal.domain) + '80' }}>{goal.domain}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FFD600', background: '#121212', borderRadius: 10, padding: '4px 10px', marginLeft: 2, border: '1.5px solid #FFD600', boxShadow: '0 0 8px #FFD60080' }}>{goal.timeframe}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0fffcf', background: '#121212', borderRadius: 10, padding: '4px 10px', marginLeft: 2, border: '1.5px solid #0fffcf', boxShadow: '0 0 8px #0fffcf80' }}>{goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect as useEffect2, useState as useState2 } from 'react';
function SharedJournal({ showToast }) {
  const [entries, setEntries] = useState2([]);
  const [input, setInput] = useState2("");
  const [loading, setLoading] = useState2(true);
  const [submitting, setSubmitting] = useState2(false);
  const textareaRef = React.useRef(null);
  const appId = "velin-demo";
  useEffect2(() => {
    setLoading(true);
    const q = query(collection(db, getPublicDataPath(appId) + "/journal"), orderBy("created", "desc"));
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  useEffect2(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, []);
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, getPublicDataPath(appId) + "/journal"), {
        text: input,
        created: Date.now(),
      });
      setInput("");
      showToast('Journal entry added!', 'success');
    } catch (err) {
      showToast('Failed to add journal entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="velin-card velin-journal-card" style={{ maxWidth: 600, margin: '0 auto', background: 'rgba(255,255,255,0.07)', boxShadow: '0 4px 32px #7f53ac22', border: 'none' }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <h2 className="velin-section-title" style={{ marginBottom: 4 }}>My Journal</h2>
        <div className="velin-section-subtitle" style={{ color: '#bdbdbd', fontStyle: 'italic', fontSize: 16 }}>
          "This is your safe space. Write your thoughts, feelings, and moments."
        </div>
      </div>
      <form onSubmit={handleAdd} style={{ margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Add journal entry form" role="form">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Start writing..."
          aria-label="Journal entry textarea"
          className="velin-journal-textarea"
          rows={5}
          maxLength={1000}
          style={{ resize: 'vertical', fontSize: 18, borderRadius: 18, background: '#f8fafc', color: '#3f2778', border: '1.5px solid #bdbdbd', padding: '18px 16px', outline: 'none', boxShadow: '0 2px 12px #7f53ac11', fontFamily: 'inherit', marginBottom: 0 }}
          disabled={submitting}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#bdbdbd', fontSize: 14 }}>{input.length} / 1000</span>
          <button type="submit" aria-label="Add journal entry" className="velin-btn-blue" style={{ padding: '12px 32px', borderRadius: 18, fontSize: 17 }} disabled={submitting || !input.trim()}>{submitting ? 'Saving...' : 'Add Entry'}</button>
        </div>
      </form>
      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div style={{ color: '#AAA', textAlign: 'center', margin: '32px 0' }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{ color: '#AAA', textAlign: 'center', margin: '32px 0' }}>No journal entries yet.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 340, overflowY: 'auto' }}>
            {entries.map(entry => (
              <li key={entry.id} className="velin-journal-entry" style={{ background: '#fff', color: '#3f2778', borderRadius: 16, margin: '0 0 18px 0', padding: '18px 18px 12px 18px', boxShadow: '0 2px 12px #7f53ac11', fontSize: 17, position: 'relative' }}>
                <div style={{ fontSize: 15, color: '#bdbdbd', marginBottom: 6, fontFamily: 'monospace' }}>{entry.created ? new Date(entry.created).toLocaleString() : ''}</div>
                <div style={{ whiteSpace: 'pre-line', fontSize: 17 }}>{entry.text}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FeedbackLoop({ showToast }) {
  const [messages, setMessages] = useState2([]);
  const [input, setInput] = useState2("");
  const [loading, setLoading] = useState2(true);
  const [mode, setMode] = useState2("message"); // message, poem, letter
  const appId = "velin-demo";
  useEffect2(() => {
    setLoading(true);
    const q = query(collection(db, getPublicDataPath(appId) + "/messages"), orderBy("created", "desc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, getPublicDataPath(appId) + "/messages"), {
        text: input,
        type: mode,
        created: Date.now(),
      });
      setInput("");
      showToast('Sent!', 'success');
    } catch (err) {
      showToast('Failed to send', 'error');
    }
  };
  return (
    <div className="velin-card" style={{ maxWidth: 600, margin: '0 auto', background: 'rgba(255,255,255,0.07)', boxShadow: '0 4px 32px #7f53ac22', border: 'none', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <h2 className="velin-section-title" style={{ marginBottom: 4 }}>Send a Message, Poem, or Letter</h2>
        <div className="velin-section-subtitle" style={{ color: '#bdbdbd', fontStyle: 'italic', fontSize: 16 }}>
          "Express yourself. Your words will be saved and cherished."
        </div>
      </div>
      <form onSubmit={handleSend} style={{ margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Send message form" role="form">
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <button type="button" className={mode === 'message' ? 'velin-btn-blue' : 'velin-btn'} style={{ flex: 1, borderRadius: 12, fontWeight: 700 }} onClick={() => setMode('message')}>Message</button>
          <button type="button" className={mode === 'poem' ? 'velin-btn-blue' : 'velin-btn'} style={{ flex: 1, borderRadius: 12, fontWeight: 700 }} onClick={() => setMode('poem')}>Poem</button>
          <button type="button" className={mode === 'letter' ? 'velin-btn-blue' : 'velin-btn'} style={{ flex: 1, borderRadius: 12, fontWeight: 700 }} onClick={() => setMode('letter')}>Letter</button>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={mode === 'poem' ? 'Write a poem...' : mode === 'letter' ? 'Write a letter...' : 'Type your message...'}
          aria-label="Message input"
          className="velin-journal-textarea"
          rows={mode === 'poem' ? 8 : 5}
          maxLength={mode === 'poem' ? 2000 : 1000}
          style={{ resize: 'vertical', fontSize: 18, borderRadius: 18, background: '#f8fafc', color: '#3f2778', border: '1.5px solid #bdbdbd', padding: '18px 16px', outline: 'none', boxShadow: '0 2px 12px #7f53ac11', fontFamily: 'inherit', marginBottom: 0 }}
          disabled={loading}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#bdbdbd', fontSize: 14 }}>{input.length} / {mode === 'poem' ? 2000 : 1000}</span>
          <button type="submit" aria-label="Send message" className="velin-btn-blue" style={{ padding: '12px 32px', borderRadius: 18, fontSize: 17 }} disabled={loading || !input.trim()}>{loading ? 'Loading...' : 'Send'}</button>
        </div>
      </form>
      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div style={{ color: '#AAA', textAlign: 'center', margin: '32px 0' }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#AAA', textAlign: 'center', margin: '32px 0' }}>No messages yet.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {messages.map(msg => (
              <li key={msg.id} className="velin-list-item" style={{ textAlign: 'left', fontSize: 17, marginBottom: 18, background: 'rgba(255,255,255,0.13)', borderRadius: 14, padding: 14, boxShadow: '0 2px 12px #7f53ac11' }}>
                <div style={{ fontWeight: 700, color: msg.type === 'poem' ? '#7f53ac' : msg.type === 'letter' ? '#43b581' : '#3f2778', marginBottom: 6, fontSize: 15 }}>{msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}</div>
                <div style={{ whiteSpace: 'pre-line', fontSize: 17 }}>{msg.text}</div>
                <div style={{ color: '#bdbdbd', fontSize: 13, marginTop: 8 }}>{new Date(msg.created).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
// Duplicate import removed. Use top-level import only.
function LoveLanguages() {
  const [memories, setMemories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const appId = "velin-demo";
  const storage = getStorage();

  // Real-time Firestore sync for shared memories
  useEffect(() => {
    const q = query(collection(db, `/artifacts/${appId}/public/data/memories`), orderBy("created", "desc"));
    const unsub = onSnapshot(q, snap => {
      setMemories(snap.docs.map(doc => doc.data()));
    });
    return unsub;
  }, []);

  // Upload to Firebase Storage and save URL in Firestore
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const fileRef = ref(storage, `memories/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await addDoc(collection(db, `/artifacts/${appId}/public/data/memories`), {
        url,
        type: file.type,
        created: Date.now(),
      });
      setFile(null);
    } catch (err) {
      alert('Upload failed. Please try again.');
    }
    setUploading(false);
  };

  return (
    <div className="velin-card" style={{ textAlign: 'center', minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <h2 style={{ margin: 0, fontWeight: 700, fontSize: 24, color: '#e57373' }}>Love Languages</h2>
      <p style={{ margin: 0, color: '#444', fontSize: 17 }}>Track and celebrate your acts of love, appreciation, and connection.<br /><span style={{ color: '#7f53ac', fontWeight: 500 }}>Now share your memories below!</span></p>

      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }} aria-label="Upload memory form" role="form">
        <input
          type="file"
          accept="image/*,video/*"
          onChange={e => setFile(e.target.files[0])}
          aria-label="Upload photo or video"
          style={{ borderRadius: 12, padding: 8, border: '1.5px solid #e0c3fc', width: '100%' }}
        />
        <button type="submit" disabled={uploading || !file} className="velin-btn-blue" style={{ minWidth: 120, opacity: uploading ? 0.7 : 1 }} aria-label="Upload memory">
          {uploading ? 'Uploading...' : 'Upload Memory'}
        </button>
      </form>

      <div style={{ width: '100%', marginTop: 12 }}>
        <h3 style={{ fontWeight: 600, fontSize: 18, color: '#657ced', marginBottom: 8 }}>Shared Memories</h3>
        {memories.length === 0 ? (
          <div style={{ color: '#AAA', fontSize: 16 }}>No memories yet. Upload a photo or video to share!</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {memories.map((mem, idx) => (
              <div key={idx} className="velin-card" style={{ padding: 0, width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {mem.type.startsWith('image') ? (
                  <img src={mem.url} alt="Memory" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
                ) : (
                  <video src={mem.url} controls style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
import { useEffect as useEffect3, useState as useState3 } from 'react';
function PrivateReflection({ showToast }) {
  const [reflections, setReflections] = useState3([]);
  const [input, setInput] = useState3("");
  const [loading, setLoading] = useState3(true);
  const appId = "velin-demo";
  const user = auth.currentUser;
  useEffect3(() => {
    if (!user) return;
    setLoading(true);
    const q = query(collection(db, `/artifacts/${appId}/users/${user.uid}/reflections`), orderBy("created", "desc"));
    const unsub = onSnapshot(q, snap => {
      setReflections(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    try {
      await addDoc(collection(db, `/artifacts/${appId}/users/${user.uid}/reflections`), {
        text: input,
        created: Date.now(),
      });
      setInput("");
      showToast('Reflection added!', 'success');
    } catch (err) {
      showToast('Failed to add reflection', 'error');
    }
  };
  if (!user) return <div>Loading...</div>;
  return (
    <div>
      <form onSubmit={handleAdd} style={{ margin: '16px 0', display: 'flex', gap: 8 }} aria-label="Add private reflection form" role="form">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Private reflection..." aria-label="Private reflection input" style={{ flex: 1, padding: 12, borderRadius: 16, border: '1.5px solid #BDBDBD', fontSize: 17, background: '#FAF8FF' }} />
        <button type="submit" aria-label="Add private reflection" className="velin-btn-blue" style={{ padding: '12px 22px', borderRadius: 16 }}>Add</button>
      </form>
      {loading ? (
        <div style={{ color: '#AAA', textAlign: 'center', margin: '32px 0' }}>Loading...</div>
      ) : reflections.length === 0 ? (
        <div style={{ color: '#AAA', textAlign: 'center', margin: '32px 0' }}>No reflections yet.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {reflections.map(ref => (
            <li key={ref.id} className="velin-list-item" style={{ textAlign: 'left', fontSize: 17 }}>{ref.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#1DB954' }, // Vibrant Teal/Neon Green
    secondary: { main: '#E1306C' }, // Instagram Red/Pink
    background: { default: '#121212', paper: '#242424' },
    success: { main: '#25D366' }, // WhatsApp Green
    text: { primary: '#f4f4f4', secondary: '#bdbdbd' },
  },
  shape: { borderRadius: 24 },
});

const modules = [
  { label: 'Dashboard', icon: <DashboardIcon />, component: <Dashboard /> },
  { label: 'Roadmap', icon: <MapIcon />, component: <Roadmap /> },
  { label: 'Journal', icon: <BookIcon />, component: <SharedJournal /> },
  { label: 'Feedback', icon: <FeedbackIcon />, component: <FeedbackLoop /> },
  { label: 'Love', icon: <FavoriteIcon />, component: <LoveLanguages /> },
  { label: 'Private', icon: <LockIcon />, component: <PrivateReflection /> },
];



function App() {
  const isDesktop = useMediaQuery('(min-width:900px)');
  // Persist tab in localStorage
  const [tab, setTab] = useState(() => {
    const stored = localStorage.getItem('velin-selected-tab');
    return stored !== null ? parseInt(stored, 10) : 0;
  });
  const [prevTab, setPrevTab] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [user, setUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(s => ({ ...s, open: false }));
  };

  // Simple anonymous auth for demo; replace with real auth as needed
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth);
    });
    return () => unsub();
  }, []);

  // Move the loading return here, after all hooks
  if (!user) {
    return <Box sx={{ p: 4, textAlign: 'center' }}>Loading...</Box>;
  }

  // Handle fade animation on tab change
  const handleTabChange = (newValue) => {
    if (newValue !== tab) {
      setFadeIn(false);
      setTimeout(() => {
        setPrevTab(tab);
        setTab(newValue);
        localStorage.setItem('velin-selected-tab', newValue);
        setFadeIn(true);
      }, 180); // match Fade timeout
    }
  };

  // Sidebar icons and labels
  const sidebarModules = [
    { label: 'Dashboard', icon: <DashboardIcon />, component: <Dashboard showToast={showToast} /> },
    { label: 'Roadmap', icon: <MapIcon />, component: <Roadmap showToast={showToast} /> },
    { label: 'Journal', icon: <BookIcon />, component: <SharedJournal showToast={showToast} /> },
    { label: 'Feedback', icon: <FeedbackIcon />, component: <FeedbackLoop showToast={showToast} /> },
    { label: 'Love', icon: <FavoriteIcon />, component: <LoveLanguages showToast={showToast} /> },
    { label: 'Private', icon: <LockIcon />, component: <PrivateReflection showToast={showToast} /> },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent', width: '100%', flex: 1 }}>
        {/* Sidebar (desktop/tablet only) */}
        {isDesktop && (
          <nav className="velin-sidebar" aria-label="Main navigation">
            {sidebarModules.map((mod, i) => (
              <button
                key={mod.label}
                className={"velin-sidebar-icon" + (tab === i ? ' active' : '')}
                aria-label={mod.label + ' tab'}
                tabIndex={0}
                onClick={() => handleTabChange(i)}
                style={{ border: 'none', background: 'none', outline: 'none' }}
              >
                {mod.icon}
              </button>
            ))}
          </nav>
        )}
        {/* Bottom nav (mobile only) */}
        <nav className="velin-bottomnav" aria-label="Mobile navigation">
          {sidebarModules.map((mod, i) => (
            <button
              key={mod.label}
              className={"velin-topnav-btn" + (tab === i ? ' active' : '')}
              aria-label={mod.label + ' tab'}
              tabIndex={0}
              onClick={() => handleTabChange(i)}
            >
              {mod.icon}
            </button>
          ))}
        </nav>
        {/* Spacer for bottom nav on mobile */}
        <div className="velin-bottomnav-spacer"></div>
        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            pl: isDesktop ? '80px' : 0,
            pr: 0,
            pt: 0,
            minHeight: '100vh',
            background: 'transparent',
            width: '100%',
            maxWidth: '100%',
            pb: { xs: '56px', sm: 0 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <Box sx={{ p: { xs: 0, sm: 4 }, width: '100%', flex: 1, minHeight: 0, pt: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Fade in={fadeIn} timeout={180} key={tab}>
              <div className="velin-fade-in" style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {sidebarModules[tab] && sidebarModules[tab].component}
              </div>
            </Fade>
          </Box>
          <Snackbar
            open={snackbar.open}
            autoHideDuration={2600}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </div>
    </ThemeProvider>
  );
}

export default App;
