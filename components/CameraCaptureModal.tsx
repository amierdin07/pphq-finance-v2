import React, { useState, useEffect, useRef, useCallback } from 'react';
import { compressImage } from '../utils/imageUtils';

interface CameraCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (dataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
    isOpen,
    onClose,
    onCapture,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Stop all media tracks
    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    // Load available video input devices
    const loadDevices = useCallback(async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
            setDevices(videoInputs);

            // If selectedDeviceId is not in current list or empty, select the first device
            if (videoInputs.length > 0) {
                setSelectedDeviceId((prev) => {
                    const exists = videoInputs.some((d) => d.deviceId === prev);
                    return exists ? prev : videoInputs[0].deviceId;
                });
            }
        } catch (err) {
            console.error('Gagal mendeteksi daftar kamera:', err);
        }
    }, []);

    // Start video stream with selected device
    const startStream = useCallback(async (deviceId?: string) => {
        stopStream();
        setIsLoading(true);
        setError(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError('Browser ini tidak mendukung akses kamera langsung.');
            setIsLoading(false);
            return;
        }

        try {
            const constraints: MediaStreamConstraints = {
                video: deviceId
                    ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
                    : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait until video can play
                await videoRef.current.play().catch(() => {});
            }

            // Once permission is granted, enumerate devices to get meaningful labels
            await loadDevices();
            setIsLoading(false);
        } catch (err: any) {
            console.error('Error starting camera stream:', err);
            let msg = 'Tidak dapat mengakses kamera.';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg = 'Tidak ada perangkat kamera yang terdeteksi.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                msg = 'Kamera sedang digunakan oleh aplikasi lain.';
            }
            setError(msg);
            setIsLoading(false);
        }
    }, [stopStream, loadDevices]);

    // Handle modal open/close
    useEffect(() => {
        if (isOpen) {
            setCapturedPreview(null);
            setError(null);
            startStream(selectedDeviceId || undefined);
        } else {
            stopStream();
            setCapturedPreview(null);
        }

        return () => {
            stopStream();
        };
    }, [isOpen]);

    // Handle device change
    const handleDeviceChange = (deviceId: string) => {
        setSelectedDeviceId(deviceId);
        setCapturedPreview(null);
        startStream(deviceId);
    };

    // Quick switch to next camera
    const handleNextCamera = () => {
        if (devices.length <= 1) return;
        const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
        const nextIndex = (currentIndex + 1) % devices.length;
        handleDeviceChange(devices[nextIndex].deviceId);
    };

    // Take snapshot from video frame
    const handleCapture = () => {
        const video = videoRef.current;
        if (!video || video.videoWidth === 0) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedPreview(dataUrl);
    };

    // Retake snapshot
    const handleRetake = () => {
        setCapturedPreview(null);
    };

    // Confirm and compress image
    const handleConfirm = async () => {
        if (!capturedPreview) return;
        setIsSaving(true);
        try {
            // Convert dataUrl to File for existing compressImage pipeline
            const res = await fetch(capturedPreview);
            const blob = await res.blob();
            const file = new File([blob], 'camera-receipt.jpg', { type: 'image/jpeg' });
            const compressed = await compressImage(file, 200);
            onCapture(compressed || capturedPreview);
            handleClose();
        } catch (err) {
            console.error('Gagal mengompres gambar:', err);
            onCapture(capturedPreview);
            handleClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        stopStream();
        setCapturedPreview(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex justify-center items-center p-3 sm:p-6 animate-fadeIn">
            <div 
                className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[95vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <circle cx="12" cy="13" r="3" strokeWidth="2" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm sm:text-base">Foto Nota via Kamera</h3>
                            <p className="text-[11px] text-slate-400 font-medium">Arahkan kamera ke kertas nota atau bukti transaksi</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-all"
                        title="Tutup"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Device Selector (Zoom Style) */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 flex-grow min-w-[200px]">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Pilih Kamera:
                        </span>
                        <select
                            value={selectedDeviceId}
                            onChange={(e) => handleDeviceChange(e.target.value)}
                            disabled={isLoading || devices.length === 0}
                            className="flex-grow text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer truncate shadow-sm disabled:opacity-50"
                        >
                            {devices.length === 0 && <option value="">Mendeteksi kamera...</option>}
                            {devices.map((device, idx) => (
                                <option key={device.deviceId || idx} value={device.deviceId}>
                                    {device.label || `Kamera ${idx + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {devices.length > 1 && (
                        <button
                            type="button"
                            onClick={handleNextCamera}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                            title="Ganti ke kamera berikutnya"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Ganti Kamera
                        </button>
                    )}
                </div>

                {/* Main Viewport */}
                <div className="relative bg-slate-950 flex items-center justify-center aspect-[4/3] sm:aspect-[16/10] overflow-hidden">
                    {/* Live Stream View */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                            capturedPreview ? 'hidden' : 'block'
                        } ${isLoading ? 'opacity-20' : 'opacity-100'}`}
                    />

                    {/* Captured Snapshot View */}
                    {capturedPreview && (
                        <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                            <img
                                src={capturedPreview}
                                alt="Hasil Tangkapan Kamera"
                                className="max-w-full max-h-full object-contain"
                            />
                            <div className="absolute top-3 left-3 bg-emerald-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-sm shadow-md flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Foto Berhasil Ditangkap
                            </div>
                        </div>
                    )}

                    {/* Framing overlay for receipts (only shown during live video) */}
                    {!capturedPreview && !isLoading && !error && (
                        <div className="absolute inset-4 sm:inset-8 pointer-events-none border-2 border-dashed border-white/40 rounded-2xl flex flex-col justify-between p-3">
                            <div className="flex justify-between items-start">
                                <span className="w-4 h-4 border-t-2 border-l-2 border-emerald-400"></span>
                                <span className="w-4 h-4 border-t-2 border-r-2 border-emerald-400"></span>
                            </div>
                            <p className="text-center text-[10px] sm:text-xs font-semibold text-white/80 drop-shadow-md bg-black/40 py-1 px-3 rounded-full mx-auto backdrop-blur-sm">
                                Posisikan kertas nota di dalam garis ini
                            </p>
                            <div className="flex justify-between items-end">
                                <span className="w-4 h-4 border-b-2 border-l-2 border-emerald-400"></span>
                                <span className="w-4 h-4 border-b-2 border-r-2 border-emerald-400"></span>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm text-white">
                            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="text-xs font-medium tracking-wide">Menghubungkan ke kamera...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 text-white">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h4 className="font-bold text-sm text-red-300 mb-1">Akses Kamera Gagal</h4>
                            <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed">{error}</p>
                            <button
                                type="button"
                                onClick={() => startStream(selectedDeviceId || undefined)}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/30"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        Batal
                    </button>

                    {!capturedPreview ? (
                        <button
                            type="button"
                            onClick={handleCapture}
                            disabled={isLoading || !!error}
                            className="flex-grow sm:flex-grow-0 sm:min-w-[180px] py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                                <circle cx="12" cy="12" r="4" fill="currentColor" />
                            </svg>
                            Ambil Foto (Jepret)
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                            <button
                                type="button"
                                onClick={handleRetake}
                                disabled={isSaving}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Ulangi Foto
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isSaving}
                                className="flex-grow sm:flex-grow-0 sm:min-w-[140px] py-2.5 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Gunakan Foto</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraCaptureModal;
