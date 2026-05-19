import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Mic, MicOff, Video, VideoOff, Phone, MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface RoomData {
  token: string;
  roomName: string;
  livekitUrl: string;
  participantName: string;
  isDoctor: boolean;
  appointment: {
    id: string;
    date: string;
    slotTime: string;
    patient: { firstName: string; lastName: string } | unknown;
    doctor: { firstName: string; lastName: string } | unknown;
  };
}

export function TelemedicinePage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: roomData, isLoading, error } = useQuery({
    queryKey: ['telemedicine', 'room', appointmentId],
    queryFn: async () => {
      const res = await api.post<{ success: boolean; data: RoomData }>(`/telemedicine/join/${appointmentId}`);
      return res.data.data;
    },
    retry: false,
    enabled: Boolean(appointmentId),
  });

  useEffect(() => {
    if (!roomData) return;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsConnected(true);
        toast.success('Camera and microphone connected');
      } catch {
        toast.error('Could not access camera/microphone. Check browser permissions.');
      }
    }

    void initMedia();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomData]);

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = isVideoOff; });
    setIsVideoOff(!isVideoOff);
  };

  const endCall = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      await api.post(`/telemedicine/end/${appointmentId}`);
    } catch { /* ignore if already ended */ }
    navigate('/telemedicine');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 gap-4">
        <Skeleton className="h-64 w-96 bg-gray-700" />
        <p className="text-white text-sm">Connecting to consultation room...</p>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 gap-4">
        <p className="text-white text-lg">Unable to join room</p>
        <p className="text-gray-400 text-sm">
          {(error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Room not available'}
        </p>
        <Link to="/telemedicine">
          <Button variant="outline" className="gap-2 text-white border-gray-600">
            <ArrowLeft className="h-4 w-4" /> Back to Telemedicine
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-900">
      {/* Main video area */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0 flex items-center justify-center">
          {isConnected ? (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Video className="h-16 w-16 mx-auto mb-3 opacity-30" />
                <p className="text-lg">Waiting for {roomData.isDoctor ? 'patient' : 'doctor'} to join...</p>
                <p className="text-sm mt-1 opacity-70">Room: {roomData.roomName}</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-white">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto mb-4" />
              <p>Accessing camera and microphone...</p>
            </div>
          )}
        </div>

        {/* Local video picture-in-picture */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-700 rounded-xl overflow-hidden shadow-2xl border border-gray-600">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <VideoOff className="h-8 w-8" />
            </div>
          )}
          <p className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-1.5 py-0.5 rounded">
            {roomData.participantName}
          </p>
        </div>

        {/* Appointment info overlay */}
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-2 rounded-lg text-sm space-y-0.5">
          <p className="font-medium">{roomData.isDoctor ? 'Patient Consultation' : 'Video Call'}</p>
          <p className="text-xs text-gray-300">
            {typeof roomData.appointment.patient === 'object' && roomData.appointment.patient !== null
              ? `Patient: ${(roomData.appointment.patient as { firstName: string; lastName: string }).firstName} ${(roomData.appointment.patient as { firstName: string; lastName: string }).lastName}`
              : ''}
          </p>
        </div>
      </div>

      {/* Controls bar */}
      <div className="bg-gray-800 px-6 py-4 shrink-0">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full h-12 w-12 ${isMuted ? 'bg-red-500 border-red-500 text-white hover:bg-red-600' : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={`rounded-full h-12 w-12 ${isVideoOff ? 'bg-red-500 border-red-500 text-white hover:bg-red-600' : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'}`}
            onClick={toggleVideo}
            title={isVideoOff ? 'Enable video' : 'Disable video'}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          {/* End call */}
          <Button
            size="icon"
            className="rounded-full h-14 w-14 bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg"
            onClick={endCall}
            title="End call"
          >
            <Phone className="h-6 w-6 rotate-[135deg]" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-12 w-12 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            title="Chat (coming soon)"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-center text-gray-500 text-xs mt-2">
          {isConnected ? 'Connected · End call to finish the consultation' : 'Connecting...'}
        </p>
      </div>
    </div>
  );
}
