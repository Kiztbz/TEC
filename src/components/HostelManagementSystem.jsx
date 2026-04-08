import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

// Utility function for localStorage
const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            return initialValue;
        }
    });

    const setValue = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.log(error);
        }
    };

    return [storedValue, setValue];
};

// Mock initial data
const initialStudents = [
    { id: 1, name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '9876543210', room: '101', block: 'A', status: 'Active', fee: 5000, paid: 5000 },
    { id: 2, name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543211', room: '102', block: 'A', status: 'Active', fee: 5000, paid: 3000 },
    { id: 3, name: 'Amit Patel', email: 'amit@example.com', phone: '9876543212', room: '201', block: 'B', status: 'Active', fee: 5000, paid: 5000 },
];

const initialRooms = [
    { id: 1, number: '101', block: 'A', type: 'Double', capacity: 2, occupied: 1, status: 'Available', condition: 'Good' },
    { id: 2, number: '102', block: 'A', type: 'Double', capacity: 2, occupied: 1, status: 'Available', condition: 'Good' },
    { id: 3, number: '103', block: 'A', type: 'Triple', capacity: 3, occupied: 0, status: 'Available', condition: 'Good' },
    { id: 4, number: '201', block: 'B', type: 'Single', capacity: 1, occupied: 1, status: 'Occupied', condition: 'Good' },
];

const initialComplaints = [
    { id: 1, studentName: 'Rajesh Kumar', room: '101', type: 'Electrical', description: 'Fan not working', status: 'Pending', priority: 'High', date: '2024-03-01' },
    { id: 2, studentName: 'Priya Sharma', room: '102', type: 'Plumbing', description: 'Tap leaking', status: 'Resolved', priority: 'Medium', date: '2024-02-28' },
];

// Dashboard Component
const Dashboard = ({ students, rooms, complaints }) => {
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'Active').length;
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.occupied > 0).length;
    const pendingComplaints = complaints.filter(c => c.status === 'Pending').length;
    const totalRevenue = students.reduce((sum, s) => sum + s.paid, 0);
    const defaulters = students.filter(s => s.paid < s.fee).length;

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Students', value: totalStudents, sub: `${activeStudents} Active`, color: 'var(--secondary)' },
                    { label: 'Rooms', value: `${occupiedRooms}/${totalRooms}`, sub: `${totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0}% Occupied`, color: 'var(--primary)' },
                    { label: 'Complaints', value: pendingComplaints, sub: 'Pending', color: '#e3b341' },
                    { label: 'Revenue', value: `₹${(totalRevenue / 1000).toFixed(1)}k`, sub: `${defaulters} Defaulters`, color: 'var(--tertiary)' },
                ].map((stat, i) => (
                    <div key={i} className="neon-card" style={{ padding: '12px 14px', borderTop: `2px solid ${stat.color}` }}>
                        <div style={{ fontSize: 8, color: 'var(--on-surface-var)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{stat.label}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
                        <div style={{ fontSize: 8, color: 'var(--on-surface-var)' }}>{stat.sub}</div>
                    </div>
                ))}
            </div>

            <div className="neon-card" style={{ padding: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 10, fontSize: 10 }}>Recent Students</div>
                {students.slice(0, 5).map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, marginBottom: 6, background: 'var(--surface-highest)', borderRadius: 5, fontSize: 10 }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                            <div style={{ fontSize: 8, color: 'var(--on-surface-var)' }}>Room {s.room} • Block {s.block}</div>
                        </div>
                        <span style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: s.status === 'Active' ? 'rgba(74,222,128,0.2)' : 'rgba(255,110,132,0.2)', color: s.status === 'Active' ? '#4ade80' : 'var(--error)', alignSelf: 'flex-start' }}>
                            {s.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Student Management Component
const StudentManagement = ({ students, setStudents, rooms }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', room: '', block: '', status: 'Active', fee: 5000, paid: 0 });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingId) {
            setStudents(students.map(s => s.id === editingId ? { ...s, ...formData } : s));
        } else {
            setStudents([...students, { id: Date.now(), ...formData }]);
        }
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', email: '', phone: '', room: '', block: '', status: 'Active', fee: 5000, paid: 0 });
    };

    const handleEdit = (student) => {
        setEditingId(student.id);
        setFormData(student);
        setShowForm(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this student?')) {
            setStudents(students.filter(s => s.id !== id));
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="eyebrow" style={{ fontSize: 10 }}>Students ({students.length})</div>
                <button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="btn-primary" style={{ fontSize: 10, padding: '6px 10px' }}>
                    <Plus size={12} style={{ marginRight: 4, display: 'inline' }} /> Add
                </button>
            </div>

            {showForm && (
                <div className="neon-card" style={{ padding: 12, marginBottom: 12 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, marginTop: 0 }}>{editingId ? 'Edit' : 'Add'} Student</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6 }}>
                        <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="neon-input" style={{ fontSize: 10 }} required />
                        <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="neon-input" style={{ fontSize: 10 }} required />
                        <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="neon-input" style={{ fontSize: 10 }} required />
                        <select value={formData.room} onChange={e => setFormData({ ...formData, room: e.target.value })} className="neon-input" style={{ fontSize: 10 }} required>
                            <option value="">Room</option>
                            {rooms.map(r => (<option key={r.id} value={r.number}>{r.number}</option>))}
                        </select>
                        <input type="text" placeholder="Block" value={formData.block} onChange={e => setFormData({ ...formData, block: e.target.value })} className="neon-input" style={{ fontSize: 10 }} required />
                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="neon-input" style={{ fontSize: 10 }}>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                        <input type="number" placeholder="Fee" value={formData.fee} onChange={e => setFormData({ ...formData, fee: parseInt(e.target.value) })} className="neon-input" style={{ fontSize: 10 }} required />
                        <input type="number" placeholder="Paid" value={formData.paid} onChange={e => setFormData({ ...formData, paid: parseInt(e.target.value) })} className="neon-input" style={{ fontSize: 10 }} required />
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 6 }}>
                            <button type="submit" className="btn-primary" style={{ fontSize: 9, padding: '5px 10px' }}>{editingId ? 'Update' : 'Add'}</button>
                            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-secondary" style={{ fontSize: 9, padding: '5px 10px' }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="neon-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead style={{ background: 'var(--surface-highest)' }}>
                        <tr>
                            {['Name', 'Email', 'Phone', 'Room', 'Fee', 'Actions'].map(h => (
                                <th key={h} style={{ padding: 6, textAlign: 'left', fontSize: 8, fontWeight: 700, color: 'var(--on-surface-var)' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid var(--outline)' }}>
                                <td style={{ padding: 6 }}>{s.name}</td>
                                <td style={{ padding: 6, fontSize: 9 }}>{s.email}</td>
                                <td style={{ padding: 6 }}>{s.phone}</td>
                                <td style={{ padding: 6 }}>{s.room}</td>
                                <td style={{ padding: 6, fontSize: 9 }}>₹{s.paid}/{s.fee}</td>
                                <td style={{ padding: 6, display: 'flex', gap: 4 }}>
                                    <button onClick={() => handleEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0 }}><Edit2 size={10} /></button>
                                    <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 0 }}><Trash2 size={10} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Main HMS Component
export default function HostelManagementSystem() {
    const [view, setView] = useState('dashboard');
    const [students, setStudents] = useLocalStorage('hostel_students', initialStudents);
    const [rooms, setRooms] = useLocalStorage('hostel_rooms', initialRooms);
    const [complaints, setComplaints] = useLocalStorage('hostel_complaints', initialComplaints);

    return (
        <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'students', label: 'Students' },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id)} style={{
                        padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10,
                        background: view === tab.id ? 'var(--surface)' : 'var(--surface-highest)',
                        color: view === tab.id ? 'var(--on-surface)' : 'var(--on-surface-var)',
                        fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em',
                        transition: 'all 0.14s', boxShadow: view === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}>
                        {tab.label}
                    </button>
                ))}
            </div>
            {view === 'dashboard' && <Dashboard students={students} rooms={rooms} complaints={complaints} />}
            {view === 'students' && <StudentManagement students={students} setStudents={setStudents} rooms={rooms} />}
        </div>
    );
}
