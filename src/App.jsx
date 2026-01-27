import React, { useState, useEffect, useRef } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, onSnapshot as onDocSnapshot } from 'firebase/firestore';
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
  const xpDocRef = doc(db, getPublicDataPath(appId) + "xp", "shared");
  const level = calculateLevel(xp);
  const userId = auth.currentUser?.uid || "-";

  // Real-time Firestore sync for goals
  useEffect(() => {
    const q = query(collection(db, getPublicDataPath(appId) + "goals"), orderBy("created", "desc"));
    const unsub = onSnapshot(q, snap => {
      setGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  // Real-time Firestore sync for journal and feedbacks (for AI)
  useEffect(() => {
    const jq = query(collection(db, getPublicDataPath(appId) + "journal"), orderBy("created", "desc"));
    const fq = query(collection(db, getPublicDataPath(appId) + "feedback"), orderBy("created", "desc"));
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
      await addDoc(collection(db, getPublicDataPath(appId) + "goals"), {
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
        <div className="velin-card" style={{ borderLeft: '6px solid #43b581', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
  const [goalText, setGoalText] = useState("");
  const [domain, setDomain] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [burstGoalId, setBurstGoalId] = useState(null);
  const appId = "velin-demo";
  const xpDocRef = doc(db, getPublicDataPath(appId) + "xp", "shared");
  const sharedGoalsPath = getPublicDataPath(appId) + "shared_goals";

  // Real-time Firestore sync for shared goals
  useEffect(() => {
    const q = query(collection(db, sharedGoalsPath));
    const unsub = onSnapshot(q, snap => {
      setGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  // Domain and timeframe options
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
    { value: "1-Year Commitment" },
    { value: "5-Year Vision" },
    { value: "10-Year Legacy" },
  ];

  // Add new goal
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goalText.trim() || !domain || !timeframe) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, sharedGoalsPath), {
        text: goalText.trim(),
        domain,
        timeframe,
        completed: false,
        created: Date.now(),
      });
      setGoalText("");
      setDomain("");
      setTimeframe("");
    } catch {}
    setSubmitting(false);
  };

  // Toggle completion and award XP
  const handleToggleComplete = async (goal) => {
    if (goal.completed) return;
    const goalRef = doc(db, sharedGoalsPath, goal.id);
    await updateDoc(goalRef, { completed: true, completedAt: Date.now() });
    // XP logic
    const xpSnap = await getDoc(xpDocRef);
    const { addXP } = await import('./xpLogic');
    const newXP = addXP(xpSnap.exists() ? xpSnap.data().xp : 0, 'goal');
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
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.created - b.created;
      });
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
        <h1 style={{ fontFamily: 'Inter, Roboto, Arial, sans-serif', fontWeight: 800, fontSize: 28, color: '#f3f3f3', letterSpacing: 0.5, margin: 0, textShadow: '0 2px 16px #0fffcf40' }}>Shared Growth Roadmap</h1>
      </div>

      {/* Instructional Box (now matches other containers) */}
      <div className="velin-card" style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(60,20,30,0.82)', border: '1.5px solid #a94442', boxShadow: '0 0 16px #a9444210' }}>
        <div style={{ fontWeight: 700, color: '#3f8efc', fontSize: 18, marginBottom: 2, fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.2 }}>Set long-term goals for alignment</div>
        <div style={{ fontSize: 15, color: '#f4f4f4', fontFamily: 'Inter, Roboto, Arial, sans-serif' }}>Completing a goal awards <span style={{ fontWeight: 700, color: '#3f8efc' }}>100 Growth Points (GP)</span> to the shared pool.</div>
      </div>

      {/* Goal Submission Form */}
      <form className="velin-card" style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'stretch', background: 'rgba(60,20,30,0.82)', boxShadow: '0 2px 12px #ffb6c120', border: '1.5px solid #a94442' }} onSubmit={handleSubmit}>
        <label style={{ fontWeight: 700, color: '#ffb6c1', fontSize: 16, marginBottom: 2, fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.2 }}>Goal Description</label>
        <textarea
          rows={4}
          value={goalText}
          onChange={e => setGoalText(e.target.value)}
          placeholder="Describe your commitment (e.g., 'Save $5,000 for emergency fund')"
          required
          className="velin-textarea"
          style={{ resize: 'vertical', minHeight: 64, maxHeight: 160, background: 'rgba(40,20,30,0.92)', color: '#f4f4f4', border: '1.5px solid #a94442', borderRadius: 14, fontSize: 16, padding: 14, fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.1, boxShadow: '0 1px 8px #ffb6c120', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
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
            <label style={{ fontWeight: 700, color: '#ffb6c1', fontSize: 15, fontFamily: 'Inter, Roboto, Arial, sans-serif' }}>Timeframe</label>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)} required className="velin-input" style={{ width: '100%', marginTop: 2, background: 'rgba(40,20,30,0.92)', color: '#f4f4f4', border: '1.5px solid #a94442', borderRadius: 12, fontSize: 15, fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.1, boxShadow: '0 1px 8px #ffb6c120', outline: 'none' }}>
              <option value="" disabled>Select timeframe</option>
              {TIMEFRAME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} style={{ color: '#a94442', background: '#ffb6c1' }}>{opt.value}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={!goalText.trim() || !domain || !timeframe || submitting} className="velin-btn" style={{ marginTop: 8, fontSize: 17, padding: '12px 0', borderRadius: 16, background: 'linear-gradient(90deg,#3f8efc,#7f53ac)', color: '#fff', fontWeight: 700, border: 'none', boxShadow: '0 2px 12px #3f8efc80', opacity: (!goalText.trim() || !domain || !timeframe || submitting) ? 0.7 : 1, textShadow: '0 2px 8px #3f8efc80', fontFamily: 'Inter, Roboto, Arial, sans-serif', letterSpacing: 0.1 }}>Commit to Goal</button>
      </form>

      {/* Grouped Goals by Timeframe */}
      {TIMEFRAME_OPTIONS.map(tf => (
        <div key={tf.value} style={{ marginBottom: 22 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#f3f3f3', margin: '0 0 8px 2px', textShadow: '0 2px 8px #0fffcf40' }}>{tf.value} ({grouped[tf.value].filter(g => !g.completed).length} outstanding)</div>
          {grouped[tf.value].length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 15, margin: '0 0 8px 8px' }}>No goals yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grouped[tf.value].map(goal => (
                <div key={goal.id} className="velin-card" style={{
                  display: 'flex', alignItems: 'center', gap: 12, background: goal.completed ? '#1a2420' : '#232323', opacity: goal.completed ? 0.7 : 1, boxShadow: goal.completed ? '0 1px 4px #0fffcf40' : undefined, position: 'relative', transition: 'background 0.2s, opacity 0.2s', borderLeft: goal.completed ? '6px solid #145c4a' : '6px solid transparent', border: 'none', color: goal.completed ? '#bdbdbd' : '#f3f3f3', borderRadius: 18 }}>
                  {/* Completion Checkbox */}
                  <div onClick={() => handleToggleComplete(goal)} style={{ cursor: goal.completed ? 'default' : 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: `2.5px solid ${goal.completed ? '#0fffcf' : '#232e2b'}`, background: goal.completed ? '#181818' : '#121212', marginRight: 2, transition: 'border 0.2s, background 0.2s', boxShadow: goal.completed ? '0 0 8px #0fffcf80' : undefined }}>
                    {goal.completed ? (
                      <svg width="22" height="22" viewBox="0 0 22 22"><polyline points="4,12 10,18 18,6" style={{ fill: 'none', stroke: '#0fffcf', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }} /></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 22 22"><rect x="4" y="4" width="14" height="14" rx="4" fill="none" stroke="#232e2b" strokeWidth="2.5" /></svg>
                    )}
                  </div>
                  {/* Goal Text */}
                  <div style={{ flex: 1, fontSize: 16, color: goal.completed ? '#bdbdbd' : '#f3f3f3', textDecoration: goal.completed ? 'line-through' : 'none', fontWeight: 500, opacity: goal.completed ? 0.7 : 1 }}>{goal.text}</div>
                  {/* Domain Tag */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: getDomainColor(goal.domain), background: '#121212', borderRadius: 10, padding: '4px 10px', marginLeft: 2, border: `1.5px solid ${getDomainColor(goal.domain)}`, boxShadow: '0 0 8px ' + getDomainColor(goal.domain) + '80' }}>{goal.domain}</div>
                  {/* Delete Button */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this goal?')) {
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
                    <span style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: 'linear-gradient(90deg,#ff3576,#ff7cae)',
                      boxShadow: '0 0 8px #ff357680',
                      opacity: 0.7,
                      zIndex: 1,
                      pointerEvents: 'none',
                    }} />
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
    </div>
  );
}

import { useEffect as useEffect2, useState as useState2 } from 'react';
function SharedJournal({ showToast }) {
  const [entries, setEntries] = useState2([]);
  const [input, setInput] = useState2("");
  const [loading, setLoading] = useState2(true);
  const appId = "velin-demo";
  useEffect2(() => {
    setLoading(true);
    const q = query(collection(db, getPublicDataPath(appId) + "journal"), orderBy("created", "desc"));
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, getPublicDataPath(appId) + "journal"), {
        text: input,
        created: Date.now(),
      });
      setInput("");
      showToast('Journal entry added!', 'success');
    } catch (err) {
      showToast('Failed to add journal entry', 'error');
    }
  };
  // Ensure return is inside the function body
  return (
    <div>
      <form onSubmit={handleAdd} style={{ margin: '16px 0', display: 'flex', gap: 8 }} aria-label="Add journal entry form" role="form">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="New journal entry..." aria-label="Journal entry input" style={{ flex: 1, padding: 12, borderRadius: 16, border: '1.5px solid #BDBDBD', fontSize: 17, background: '#FAF8FF' }} />
        <button type="submit" aria-label="Add journal entry" className="velin-btn-blue" style={{ padding: '12px 22px', borderRadius: 16 }}>Add</button>
      </form>
      {loading ? (
        <div style={{ color: '#AAA', textAlign: 'center', margin: '32px 0' }}>Loading...</div>
      ) : entries.length === 0 ? (
        <div style={{ color: '#AAA', textAlign: 'center', margin: '32px 0' }}>No journal entries yet.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {entries.map(entry => (
            <li key={entry.id} className="velin-list-item" style={{ textAlign: 'left', fontSize: 17 }}>{entry.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedbackLoop({ showToast }) {
  const [feedbacks, setFeedbacks] = useState2([]);
  const [input, setInput] = useState2("");
  const [loading, setLoading] = useState2(true);
  const appId = "velin-demo";
  useEffect2(() => {
    setLoading(true);
    const q = query(collection(db, getPublicDataPath(appId) + "feedback"), orderBy("created", "desc"));
    const unsub = onSnapshot(q, snap => {
      setFeedbacks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, getPublicDataPath(appId) + "feedback"), {
        text: input,
        created: Date.now(),
      });
      setInput("");
      showToast('Feedback added!', 'success');
    } catch (err) {
      showToast('Failed to add feedback', 'error');
    }
  };
  return (
    <div>
      <form onSubmit={handleAdd} style={{ margin: '16px 0', display: 'flex', gap: 8 }} aria-label="Add feedback form" role="form">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="New feedback..." aria-label="Feedback input" style={{ flex: 1, padding: 12, borderRadius: 16, border: '1.5px solid #BDBDBD', fontSize: 17, background: '#FAF8FF' }} />
        <button type="submit" aria-label="Add feedback" className="velin-btn-blue" style={{ padding: '12px 22px', borderRadius: 16 }}>Add</button>
      </form>
      {loading ? (
        <div style={{ color: '#AAA', textAlign: 'center', margin: '32px 0' }}>Loading...</div>
      ) : feedbacks.length === 0 ? (
        <div style={{ color: '#AAA', textAlign: 'center', margin: '32px 0' }}>No feedback yet.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {feedbacks.map(fb => (
            <li key={fb.id} className="velin-list-item" style={{ textAlign: 'left', fontSize: 17 }}>{fb.text}</li>
          ))}
        </ul>
      )}
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
