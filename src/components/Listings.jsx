import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import AdBanner from './AdBanner';

const TABS = ["PG / Hostels", "Restaurants", "Rentals", "Hangout Spots", "Activities"];
const TAB_ICONS = { "PG / Hostels": "home", "Restaurants": "restaurant", "Rentals": "two_wheeler", "Hangout Spots": "celebration", "Activities": "directions_run" };
const TAB_COLOR = { "PG / Hostels": "#e3b341", "Restaurants": "var(--error)", "Rentals": "var(--secondary)", "Hangout Spots": "var(--primary)", "Activities": "var(--tertiary)" };

const DATA = {
  "PG / Hostels": [
    { name: "Sunrise Boys PG", loc: "Bidholi", price: "6,500/mo", rating: 4.4, tags: ["AC", "WiFi", "Meals", "24hr Security"], desc: "Clean rooms, home-cooked meals, 5min from campus gate.", reviews: 42 },
    { name: "Patel Bhawan Girls PG", loc: "Bidholi", price: "7,200/mo", rating: 4.6, tags: ["Fully Furnished", "CCTV", "Meals", "Laundry"], desc: "Safe and comfortable hostel-style PG exclusively for girls.", reviews: 61 },
    { name: "Shiv Shakti Residency", loc: "Pondha", price: "5,200/mo", rating: 4.1, tags: ["Shared Rooms", "WiFi", "Parking"], desc: "Budget-friendly option near Pondha campus.", reviews: 28 },
    { name: "Greenwood Hostel", loc: "Bidholi", price: "6,000/mo", rating: 4.3, tags: ["AC", "Gym", "Mess", "Library Room"], desc: "Modern hostel with 24hr electricity backup.", reviews: 55 },
    { name: "Galaxy PG Rooms", loc: "Sahastradhara Road", price: "5,800/mo", rating: 4.0, tags: ["Single Rooms", "Attached Bath", "WiFi"], desc: "Individual privacy with attached bathroom.", reviews: 19 },
    { name: "Ashoka Residency", loc: "Premnagar", price: "5,000/mo", rating: 3.9, tags: ["Budget", "Meals", "Shared"], desc: "Most affordable option with decent food.", reviews: 33 },
  ],
  "Restaurants": [
    { name: "Chai Sutta Bar", loc: "Rajpur Road", price: "50-150", rating: 4.7, tags: ["Chai", "Snacks", "Student Fav", "Late Night"], desc: "The classic student hangout. Unlimited chai and vibe.", reviews: 214 },
    { name: "Moustache Cafe", loc: "Rajpur Road", price: "150-400", rating: 4.8, tags: ["Coffee", "Brunch", "WiFi"], desc: "Best cafe ambiance in Dehradun. Perfect for study sessions.", reviews: 387 },
    { name: "Bidholi Dhaba", loc: "Near Campus Gate", price: "80-200", rating: 4.2, tags: ["Thali", "North Indian", "Cheap"], desc: "Authentic dal-roti-sabzi at unbeatable prices near campus.", reviews: 119 },
    { name: "Crust N Bake", loc: "Bidholi", price: "100-350", rating: 4.4, tags: ["Pizza", "Burgers", "Shakes"], desc: "Best pizzas within 2km of campus. Delivery available.", reviews: 98 },
    { name: "Pondha Food Corner", loc: "Pondha Chowk", price: "60-180", rating: 4.3, tags: ["South Indian", "Dosa", "Breakfast"], desc: "Amazing South Indian breakfast spot open from 7 AM.", reviews: 76 },
    { name: "The Classy Diner", loc: "Maharani Bagh", price: "200-600", rating: 4.5, tags: ["Multi-cuisine", "Date Spot", "AC"], desc: "Great for celebrations and special occasions.", reviews: 143 },
  ],
  "Rentals": [
    { name: "SpeedRental Bikes", loc: "Bidholi Gate", price: "250/day", rating: 4.5, tags: ["Bikes", "Scooters", "Helmets"], desc: "Honda Activa and Yamaha FZ available for daily rental.", reviews: 67 },
    { name: "Campus Laptop Rentals", loc: "Near Library", price: "400/day", rating: 4.0, tags: ["Core i5", "Windows 11", "Exam"], desc: "Affordable laptop rentals primarily for exam seasons.", reviews: 41 },
    { name: "Cycle Junction", loc: "Pondha", price: "100/day", rating: 4.6, tags: ["Cycles", "MTB", "Eco-friendly"], desc: "Eco-friendly campus commute. MTB cycles available.", reviews: 88 },
    { name: "Dehradun Rent A Car", loc: "Clock Tower", price: "1200/day", rating: 4.1, tags: ["Car", "Weekend Trips"], desc: "Hatchbacks for weekend getaways to Mussoorie.", reviews: 32 },
    { name: "Flash Scooter Share", loc: "App-based", price: "10/km", rating: 4.3, tags: ["Electric", "Hourly", "App"], desc: "Electric scooter rental by minute via mobile app.", reviews: 156 },
  ],
  "Hangout Spots": [
    { name: "Sahastradhara Waterfalls", loc: "8km from campus", price: "Free", rating: 4.8, tags: ["Nature", "Waterfalls", "Weekend"], desc: "Sulphur springs and scenic waterfalls. A must-visit.", reviews: 892 },
    { name: "Robbers Cave", loc: "7km from campus", price: "30 entry", rating: 4.7, tags: ["Caves", "Trek", "Adventure"], desc: "Natural cave with cold stream. Popular weekend destination.", reviews: 1203 },
    { name: "Pacific Mall", loc: "GMS Road", price: "Free", rating: 4.2, tags: ["Mall", "Movies", "Shopping"], desc: "Full-day entertainment under one roof.", reviews: 445 },
    { name: "Tapkeshwar Temple", loc: "Garhi Cantonment", price: "Free", rating: 4.6, tags: ["Spiritual", "Caves", "Nature"], desc: "Peaceful cave temple with a river stream.", reviews: 357 },
    { name: "Doon Sports Club", loc: "Raipur Road", price: "100-300", rating: 4.0, tags: ["Cricket", "Badminton", "Pool"], desc: "Multi-sport facility open to students.", reviews: 89 },
    { name: "Mind Melt Board Game Cafe", loc: "Rajpur Road", price: "100/hr pp", rating: 4.9, tags: ["Board Games", "Chill", "Indoor"], desc: "Best indoor hangout. 100+ board games, amazing drinks.", reviews: 278 },
  ],
  "Activities": [
    { name: "River Rafting - Rishikesh", loc: "Rishikesh 50km", price: "600-2500", rating: 4.9, tags: ["Rafting", "Adventure", "Weekend"], desc: "Grade 3-4 rapids on the Ganges.", reviews: 2100 },
    { name: "Mussoorie Trekking", loc: "Mussoorie 35km", price: "200-500", rating: 4.7, tags: ["Trek", "Hills", "Scenic"], desc: "Routes via Kempty Falls and George Everest Peak.", reviews: 640 },
    { name: "Bungee & Zipline Park", loc: "Mohan Chatti", price: "1800/activity", rating: 4.6, tags: ["Bungee", "Zipline", "Extreme"], desc: "India''s highest bungee jump near Rishikesh.", reviews: 512 },
    { name: "Campus Cricket League", loc: "Campus Ground", price: "Free", rating: 4.5, tags: ["Cricket", "On-Campus", "Team"], desc: "Intra-campus cricket tournaments with prizes.", reviews: 88 },
    { name: "Photography Walk", loc: "Doon Valley", price: "100 guided", rating: 4.8, tags: ["Photography", "Sunrise", "Nature"], desc: "Student-led walks at sunrise. Explore Doon Valley.", reviews: 57 },
    { name: "Camping at Dhanaulti", loc: "Dhanaulti 60km", price: "1500/pp", rating: 4.8, tags: ["Camping", "Bonfire", "Hills"], desc: "Overnight camping with bonfires and stargazing.", reviews: 330 },
  ],
};

function Stars({ rating }) {
  return (
    <span style={{ fontSize: 12, color: "#f59e0b" }}>
      {"★".repeat(Math.floor(rating))}{"☆".repeat(5 - Math.floor(rating))}
      <span style={{ color: "var(--on-surface-var)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>{rating}</span>
    </span>
  );
}

export default function Listings() {
  const [tab, setTab] = useState("PG / Hostels");
  const [search, setSearch] = useState("");
  const [listingsData, setListingsData] = useState(DATA);

  useEffect(() => {
    async function load() {
      // Fetch admin-controlled listings
      const { data: adminData } = await supabase
        .from('admin_listings')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch HMS-managed hostels that are listed & approved
      const { data: hmsData } = await supabase
        .from('hms_properties')
        .select('name, loc, price, tags, description, rating, reviews, gender')
        .eq('listed_on_tec', true)
        .eq('tec_approved', true);

      // Build the grouped object starting from static DATA (fallback)
      const grouped = {};
      TABS.forEach(t => grouped[t] = [...(DATA[t] || [])]);

      // HMS hostels go to top of PG / Hostels tab with a verified flag
      if (hmsData && hmsData.length > 0) {
        const hmsFormatted = hmsData.map(h => ({
          ...h,
          tags: Array.isArray(h.tags) ? h.tags : (h.tags || '').split(',').map(t => t.trim()).filter(Boolean),
          hmsVerified: true,
        }));
        grouped['PG / Hostels'] = [...hmsFormatted, ...grouped['PG / Hostels']];
      }

      // Admin listings override / append per tab
      if (adminData && adminData.length > 0) {
        TABS.forEach(t => { grouped[t] = grouped[t] || []; });
        adminData.forEach(item => { if (grouped[item.tab]) grouped[item.tab].push(item); });
      }

      setListingsData(grouped);
    }
    load();
  }, []);

  const items = (listingsData[tab] || []).filter(item =>
    !search ||
    (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.loc || '').toLowerCase().includes(search.toLowerCase()) ||
    (Array.isArray(item.tags) ? item.tags : (item.tags || '').split(','))
      .some(t => (t || '').toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="page-wrap" style={{ maxWidth: 1140 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Campus Grid</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, marginBottom: 12 }}>
        LOCAL_<span className="accent-primary">LISTINGS</span>
      </h1>
      <p style={{ color: "var(--on-surface-var)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>PGs, eateries, rentals, hangout spots and activities around campus.</p>
      <div style={{ position: "relative", maxWidth: 360, marginBottom: 24 }}>
        <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 17, color: "var(--on-surface-var)" }}>search</span>
        <input className="neon-input" placeholder="Search listings" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40, width: "100%" }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 16px",
            borderRadius: 9999, fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700,
            letterSpacing: "0.06em", cursor: "pointer", border: "none", transition: "all 0.14s",
            background: tab === t ? (TAB_COLOR[t] || "var(--primary)") : "var(--surface-highest)",
            color: tab === t ? "#000" : "var(--on-surface-var)",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{TAB_ICONS[t]}</span>
            {t}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: 12 }}>        {items.length === 0 && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--on-surface-var)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.25, display: 'block', marginBottom: 12 }}>{TAB_ICONS[tab]}</span>
          No listings in this category yet.
        </div>
      )}        {items.map((item, i) => (
        <motion.div key={item.name} className="neon-card" style={{ padding: 22, borderTop: `2px solid ${TAB_COLOR[tab] || "var(--primary)"}` }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>{item.name}</h3>
              {item.hmsVerified && (
                <span title="Verified HMS Property" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '2px 6px', borderRadius: 20, background: 'rgba(204,151,255,0.12)', border: '1px solid rgba(204,151,255,0.3)', color: 'var(--primary)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 10 }}>verified</span>HMS
                </span>
              )}
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 14, color: TAB_COLOR[tab] || "var(--primary)", whiteSpace: "nowrap" }}>Rs.{item.price}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: "var(--on-surface-var)" }}>location_on</span>
            <span style={{ fontSize: 12, color: "var(--on-surface-var)" }}>{item.loc}</span>
            <span style={{ marginLeft: "auto" }}><Stars rating={item.rating} /></span>
          </div>
          <p style={{ fontSize: 13, color: "var(--on-surface-var)", lineHeight: 1.5, marginBottom: 12 }}>{item.description || item.desc}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
            {(Array.isArray(item.tags) ? item.tags : (item.tags || '').split(',').map(t => t.trim()).filter(Boolean))
              .map(t => <span key={t} className="tag-ghost" style={{ fontSize: 10 }}>{t}</span>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--on-surface-var)", fontFamily: "var(--font-mono)" }}>{item.reviews || 0} reviews</span>
            <button className="btn-secondary" style={{ padding: "5px 14px", fontSize: 11 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>View
            </button>
          </div>
        </motion.div>
      ))}

        {/* Ad grid slots — every 5 items */}
        {items.length >= 5 && (
          Array.from({ length: Math.floor(items.length / 5) }).map((_, ai) => (
            <AdBanner key={`ad-${ai}`} variant="grid" offset={ai + 3} />
          ))
        )}

        {items.length === 0 && search && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "48px 0", color: "var(--on-surface-var)" }}>No listings match your search.</div>}
      </div>
    </div>
  );
}
