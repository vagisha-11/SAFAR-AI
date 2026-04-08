'use client';

import { useSafarStore } from '@/lib/store';
import { useEffect, useState } from 'react';

export default function PhotoViewer() {
    const { photoViewerPlace, setPhotoViewerPlace } = useSafarStore();
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!photoViewerPlace) {
            setImages([]);
            setError(null);
            return;
        }

        const fetchImages = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch images related to the place name using Wikimedia Commons API
                const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(photoViewerPlace)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&format=json&origin=*`;
                
                const res = await fetch(url);
                const data = await res.json();
                
                if (data && data.query && data.query.pages) {
                    const pages = Object.values(data.query.pages) as any[];
                    const urls = pages
                        .filter(page => page.imageinfo && page.imageinfo.length > 0)
                        .map(page => page.imageinfo[0].url)
                        .filter(url => url.match(/\.(jpeg|jpg|gif|png)$/i));

                    if (urls.length > 0) {
                        setImages(urls);
                    } else {
                        setError(`No suitable photos found for ${photoViewerPlace} on Wikimedia Commons.`);
                    }
                } else {
                    setError(`No photos found for ${photoViewerPlace} on Wikimedia Commons.`);
                }
            } catch (err) {
                console.error("Wikimedia Commons fetch error", err);
                setError('Failed to load photos.');
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, [photoViewerPlace]);

    if (!photoViewerPlace) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
        }}>
            <div style={{
                width: '100%',
                maxWidth: 1000,
                height: '85%',
                background: '#1a1a2e',
                borderRadius: 16,
                padding: 24,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 'bold', color: 'white', margin: 0 }}>
                        📷 Photos of {photoViewerPlace}
                    </h2>
                    <button 
                        onClick={() => {
                            setPhotoViewerPlace(null);
                            setImages([]);
                        }}
                        style={{
                            background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%',
                            width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: 8 }}>
                    {loading && (
                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#a0a0cc', fontSize: 18 }}>
                            Searching Wikimedia Commons...
                        </div>
                    )}

                    {error && (
                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 18, textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    {!loading && !error && images.length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                            gap: 16,
                            paddingBottom: 24
                        }}>
                            {images.map((url, idx) => (
                                <a 
                                    key={idx} 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ display: 'block', textDecoration: 'none', background: '#0f0f1a', borderRadius: 8, overflow: 'hidden' }}
                                >
                                    <img 
                                        src={url} 
                                        alt={`${photoViewerPlace} photo ${idx + 1}`} 
                                        style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                                        loading="lazy"
                                    />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
