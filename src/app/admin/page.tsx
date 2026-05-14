'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash, Check, X, LogOut, Loader2, Map } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSession, signIn, signOut } from "next-auth/react";

const LeafletMap = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-200 animate-pulse flex items-center justify-center">Loading Map...</div>
});

export default function AdminPage() {
    const { data: session, status } = useSession();
    const [stations, setStations] = useState<any[]>([]);
    const [view, setView] = useState<'list' | 'add'>('list');
    const [loading, setLoading] = useState(false);
    const [citySearch, setCitySearch] = useState('');
    const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        lat: '',
        lng: '',
        totalSlots: '',
        pricePerHour: '',
        status: 'Active'
    });

    useEffect(() => {
        if (session) {
            fetchStations();
        }
    }, [session]);

    const fetchStations = async () => {
        const res = await fetch('/api/stations?owner=true');
        if (res.ok) {
            const data = await res.json();
            setStations(data);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this station?')) return;
        const res = await fetch(`/api/stations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchStations();
        } else {
            alert('Failed to delete station');
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const res = await fetch(`/api/stations/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            fetchStations();
        } else {
            alert('Failed to update status');
        }
    };

    const handleSearchInput = (text: string) => {
        setCitySearch(text);
        if (text.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`);
                const data = await res.json();
                setSuggestions(data);
                setShowSuggestions(true);
            } catch (error) {
                console.error("Failed to fetch suggestions", error);
            }
        }, 600); // 600ms debounce
    };

    const handleSelectSuggestion = (suggestion: any) => {
        setCitySearch(suggestion.display_name);
        setMapCenter([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const handleCitySearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowSuggestions(false);
        if (!citySearch.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                setMapCenter([lat, lon]);
            } else {
                alert('City not found. Try a different search.');
            }
        } catch (error) {
            console.error('Search failed', error);
            alert('Search failed. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/stations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    location: {
                        lat: parseFloat(formData.lat),
                        lng: parseFloat(formData.lng)
                    },
                    totalSlots: parseInt(formData.totalSlots),
                    pricePerHour: parseFloat(formData.pricePerHour)
                })
            });

            if (res.ok) {
                setFormData({
                    name: '', address: '', lat: '', lng: '', totalSlots: '', pricePerHour: '', status: 'Active'
                });
                setView('list');
                fetchStations();
            } else {
                alert('Failed to add station. Make sure all fields are valid.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50">
                <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 w-[400px] text-center">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Partner Portal</h1>
                    <p className="text-gray-500 mb-8">Sign in to manage your charging stations.</p>
                    <button 
                        onClick={() => signIn('google')} 
                        className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center">
                    {session.user?.image && (
                        <img src={session.user.image} alt="Profile" className="w-12 h-12 rounded-full mr-4 border-2 border-emerald-100" />
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Welcome, {session.user?.name}</h1>
                        <p className="text-sm text-gray-500">Manage your charging infrastructure</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    {view === 'list' ? (
                        <button
                            onClick={() => setView('add')}
                            className="flex items-center bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                        >
                            <Plus className="h-5 w-5 mr-2" /> Add Station
                        </button>
                    ) : (
                        <button
                            onClick={() => setView('list')}
                            className="flex items-center bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                        >
                            <X className="h-5 w-5 mr-2" /> Cancel
                        </button>
                    )}
                    <button 
                        onClick={() => signOut()}
                        className="flex items-center bg-red-50 text-red-600 px-4 py-2.5 rounded-lg hover:bg-red-100 transition-colors font-semibold"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {view === 'add' ? (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-6 text-gray-800">Add New Station</h2>

                    {/* City Search Bar */}
                    <div className="mb-6 relative">
                        <form onSubmit={handleCitySearch} className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Search for a city or area to center the map (e.g., Mumbai, Delhi)" 
                                className="flex-grow border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                                value={citySearch}
                                onChange={e => handleSearchInput(e.target.value)}
                                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            />
                            <button 
                                type="submit" 
                                disabled={isSearching}
                                className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                {isSearching ? 'Searching...' : 'Search'}
                            </button>
                        </form>

                        {showSuggestions && suggestions.length > 0 && (
                            <ul className="absolute z-[1000] w-full bg-white border border-gray-200 shadow-2xl rounded-lg mt-2 max-h-60 overflow-y-auto">
                                {suggestions.map((s, index) => (
                                    <li 
                                        key={index} 
                                        onClick={() => handleSelectSuggestion(s)}
                                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-gray-700 transition-colors flex items-center"
                                    >
                                        <Map className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                                        {s.display_name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Map Selection */}
                    <div className="mb-6 h-[400px] w-full border-2 border-gray-200 rounded-xl overflow-hidden relative z-0">
                        <LeafletMap
                            stations={stations}
                            searchCenter={mapCenter}
                            onLocationSelect={(lat: number, lng: number) => {
                                setFormData({ ...formData, lat: lat.toFixed(6), lng: lng.toFixed(6) });
                            }}
                            selectedLocation={
                                formData.lat && formData.lng
                                    ? [parseFloat(formData.lat), parseFloat(formData.lng)]
                                    : null
                            }
                        />
                    </div>
                    <p className="text-sm text-emerald-600 mb-8 font-medium bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                        ✨ Tip: Click anywhere on the map to automatically fill the Latitude and Longitude!
                    </p>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Station Name</label>
                            <input placeholder="e.g. Downtown Fast Charger" className="w-full border-gray-300 border p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                            <input placeholder="e.g. 123 Main St, City" className="w-full border-gray-300 border p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                            <input placeholder="e.g. 28.61" type="number" step="any" className="w-full border-gray-300 border p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow bg-gray-50" value={formData.lat} onChange={e => setFormData({ ...formData, lat: e.target.value })} required readOnly />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                            <input placeholder="e.g. 77.20" type="number" step="any" className="w-full border-gray-300 border p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow bg-gray-50" value={formData.lng} onChange={e => setFormData({ ...formData, lng: e.target.value })} required readOnly />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Slots</label>
                            <input placeholder="Number of charging points" type="number" min="1" className="w-full border-gray-300 border p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow" value={formData.totalSlots} onChange={e => setFormData({ ...formData, totalSlots: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Hour (₹)</label>
                            <input placeholder="e.g. 150" type="number" step="0.01" min="0" className="w-full border-gray-300 border p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow" value={formData.pricePerHour} onChange={e => setFormData({ ...formData, pricePerHour: e.target.value })} required />
                        </div>

                        <div className="md:col-span-2 mt-4 pt-6 border-t border-gray-100">
                            <button disabled={loading} className="w-full bg-emerald-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50">
                                {loading ? 'Saving Station...' : 'Launch Station'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {stations.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <Map className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No stations yet</h3>
                            <p>Click "Add Station" to create your first charging point.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Station Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pricing/Slots</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stations.map(station => (
                                    <tr key={station._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{station.name}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{station.address}</div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <select
                                                value={station.status}
                                                onChange={(e) => handleStatusUpdate(station._id, e.target.value)}
                                                className={`text-sm rounded-lg border-gray-200 bg-white font-bold p-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm ${station.status === 'Active' ? 'text-emerald-600' : station.status === 'Busy' ? 'text-amber-600' : 'text-red-600'
                                                    }`}
                                            >
                                                <option value="Active">🟢 Active</option>
                                                <option value="Busy">🟡 Busy</option>
                                                <option value="Maintenance">🔴 Maintenance</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">₹{station.pricePerHour}/hr</div>
                                            <div className="text-xs text-gray-500">{station.totalSlots} Slots Total</div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleDelete(station._id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                                <Trash className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
