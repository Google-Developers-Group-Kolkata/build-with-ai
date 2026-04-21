'use client';

import { startTransition, useEffect, useRef, useState } from 'react';
import type { Participant } from '@/lib/participants';
import { useQrScanner } from '@/hooks/useQrScanner';

const QR_READER_ID = 'qr-reader';
const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,})/i;

function extractEmail(raw: string): string | null {
  let s = raw.trim();
  try { s = decodeURIComponent(s); } catch { s = raw.trim(); }
  return s.match(EMAIL_PATTERN)?.[1]?.toLowerCase() ?? null;
}

function formatTime(ts: string | null) {
  if (!ts) return 'Not checked in';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
}

// ─── Participant Detail Modal ─────────────────────────────────────────────────

function ParticipantModal({
  participant,
  onConfirm,
  onClose,
  isSubmitting,
}: {
  participant: Participant;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  // Close on backdrop click
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md animate-[slideUp_0.25s_ease-out] rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
              {participant.present ? 'Already checked in' : 'Pending check-in'}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-950">{participant.name}</h2>
          </div>
          <span className={`mt-1 shrink-0 rounded-full px-3 py-1 text-sm font-medium ${participant.present ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
            {participant.present ? 'Present' : 'Pending'}
          </span>
        </div>

        <div className="mt-5 space-y-2 rounded-[1.25rem] bg-stone-50 p-4 text-sm text-stone-700">
          <div className="flex justify-between">
            <span className="text-stone-400">Email</span>
            <span className="font-medium text-stone-900">{participant.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Company</span>
            <span className="font-medium text-stone-900">{participant.company}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Ticket</span>
            <span className="font-medium text-stone-900">{participant.ticketType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Check-in time</span>
            <span className="font-medium text-stone-900">{formatTime(participant.checkedInAt)}</span>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            className="flex-1 rounded-[1rem] border border-stone-300 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          {!participant.present && (
            <button
              className="flex-1 rounded-[1rem] bg-amber-500 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onConfirm}
              type="button"
            >
              {isSubmitting ? 'Registering…' : '✓ Register'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Scanner Modal ────────────────────────────────────────────────────────────

function ScannerModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-stone-950 text-stone-50">
      <div className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-300">Live scanner</p>
          <h2 className="mt-1 text-xl font-semibold">Scan QR code</h2>
        </div>
        <button
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium transition hover:border-amber-300 hover:text-amber-200"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
      <div className="flex-1 px-4 pb-8">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CheckInDashboard({ initialParticipants }: { initialParticipants: Participant[] }) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualValue, setManualValue] = useState('');

  // ── modal state ──────────────────────────────────────────────────────────
  const [modalParticipant, setModalParticipant] = useState<Participant | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // ── search with debounce ─────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1); // reset to first page on new search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(value.trim().toLowerCase()), 300);
  }
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── sorted + filtered participants ──────────────────────────────────────
  const PAGE_SIZE = 10;

  const sortedParticipants = [...participants].sort((a, b) =>
    a.email.localeCompare(b.email),
  );

  const filteredParticipants = searchQuery
    ? sortedParticipants.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery) ||
        p.email.toLowerCase().includes(searchQuery) ||
        p.company.toLowerCase().includes(searchQuery),
    )
    : sortedParticipants;

  // ── QR scanner hook ──────────────────────────────────────────────────────
  const { cameraState, scannerReady, retry, pause, resume } = useQrScanner({
    elementId: QR_READER_ID,
    onScan: (rawValue) => {
      const email = extractEmail(rawValue);
      if (!email) return;
      const found = participants.find((p) => p.email === email);
      if (found) {
        pause();
        setModalParticipant(found);
      }
    },
    debounceMs: 4000,
  });

  useEffect(() => {
    if (!scannerOpen) return;
    const raf = requestAnimationFrame(() => retry());
    return () => cancelAnimationFrame(raf);
  }, [scannerOpen, retry]);

  // ── camera label ─────────────────────────────────────────────────────────
  const cameraLabel =
    cameraState === 'ready' ? 'Scanning' :
      cameraState === 'paused' ? 'Paused' :
        cameraState === 'starting' ? 'Starting…' :
          cameraState === 'insecure' ? 'HTTPS required' :
            cameraState === 'denied' ? 'Permission denied' :
              cameraState === 'unsupported' ? 'Not supported' :
                cameraState === 'error' ? 'Camera error' : 'Idle';

  // ── data helpers ─────────────────────────────────────────────────────────

  async function refreshParticipants() {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/participants', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as { participants: Participant[] };
      startTransition(() => setParticipants(data.participants));
    } catch { /* silent */ }
    finally { setIsRefreshing(false); }
  }

  async function submitCheckIn(email: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      });
      const data = (await res.json()) as { message: string; participant?: Participant };
      if (res.ok && data.participant) {
        const updated = data.participant;
        startTransition(() =>
          setParticipants((prev) => prev.map((p) => (p.email === updated.email ? updated : p))),
        );
        setModalParticipant(updated);
      }
      if (res.status === 409) void refreshParticipants();
    } catch { /* silent */ }
    finally { setIsSubmitting(false); }
  }

  function closeModal() {
    setModalParticipant(null);
    resume(); // re-enable QR decoding
  }

  // ── derived counts ───────────────────────────────────────────────────────
  const presentCount = participants.filter((p) => p.present).length;
  const absentCount = participants.length - presentCount;

  // ── Scanner panel (shared between inline + modal) ────────────────────────
  const scannerPanel = (
    <>
      <div
        id={QR_READER_ID}
        className="min-h-[280px] w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-stone-900 [&_video]:w-full [&_video]:rounded-[1.75rem] [&_video]:object-cover"
      />
      <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p className="text-sm uppercase tracking-widest text-stone-300">{cameraLabel}</p>
        <p className="mt-2 text-sm text-stone-400">
          {scannerReady ? 'Point camera at a QR code.' : 'Allow camera access to begin scanning.'}
        </p>
        <button
          className="mt-3 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-stone-100 transition hover:border-amber-300 hover:text-amber-200"
          onClick={retry}
          type="button"
        >
          Retry camera
        </button>
      </div>
    </>
  );

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Participant confirm modal ──────────────────────────────────── */}
      {modalParticipant && (
        <ParticipantModal
          participant={modalParticipant}
          isSubmitting={isSubmitting}
          onConfirm={() => void submitCheckIn(modalParticipant.email)}
          onClose={closeModal}
        />
      )}

      {/* ── Full-screen scanner modal ──────────────────────────────────── */}
      {scannerOpen && (
        <ScannerModal onClose={() => setScannerOpen(false)}>
          {scannerPanel}
        </ScannerModal>
      )}

      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.22),_transparent_32%),linear-gradient(180deg,_#fff9ed_0%,_#fff3dc_42%,_#f7e7c7_100%)] px-4 py-8 text-stone-900 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

          {/* ── Header / stats ──────────────────────────────────────────── */}
          <section className="grid gap-4 rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_24px_80px_rgba(120,53,15,0.12)] backdrop-blur md:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-700">
                Seminar entry desk
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                QR check-in for your participant list
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
                Scan a participant QR code or search the list to confirm attendance.
              </p>
              {/* Scan Now CTA */}
              <button
                className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-amber-300 shadow-lg transition hover:bg-stone-800 active:scale-95"
                onClick={() => setScannerOpen(true)}
                type="button"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <rect x="7" y="7" width="3" height="3" /><rect x="14" y="7" width="3" height="3" /><rect x="7" y="14" width="3" height="3" /><rect x="14" y="14" width="3" height="3" />
                </svg>
                Scan Now
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
              <div className="rounded-[1.5rem] bg-stone-950 px-5 py-4 text-stone-50">
                <p className="text-sm text-stone-300">Total</p>
                <p className="mt-2 text-3xl font-semibold">{participants.length}</p>
              </div>
              <div className="rounded-[1.5rem] bg-emerald-100 px-5 py-4">
                <p className="text-sm text-emerald-900">Checked in</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-950">{presentCount}</p>
              </div>
              <div className="rounded-[1.5rem] bg-amber-100 px-5 py-4">
                <p className="text-sm text-amber-900">Waiting</p>
                <p className="mt-2 text-3xl font-semibold text-amber-950">{absentCount}</p>
              </div>
            </div>
          </section>

          {/* ── manual ────────────────────────────────────────── */}
          {/* Participant list */}
          <section className="rounded-[2rem] border border-white/65 bg-white/90 p-5 shadow-[0_24px_80px_rgba(120,53,15,0.12)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-amber-700">Attendance register</p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-950">Participant list</h2>
              </div>
              <p className="text-xs text-stone-400">{filteredParticipants.length} shown</p>
            </div>

            {/* Debounced search */}
            <div className="mt-4">
              <input
                className="w-full rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-amber-400"
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name, email or company…"
                type="search"
                value={searchInput}
              />
            </div>

            <div className="mt-4 grid gap-3">
              {filteredParticipants.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-400">No participants match your search.</p>
              ) : (
                filteredParticipants
                  .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                  .map((participant) => (
                    <button
                      key={participant.id}
                      className="w-full rounded-[1.4rem] border border-stone-200 bg-stone-50 px-4 py-4 text-left transition hover:border-amber-300 hover:bg-amber-50 active:scale-[0.99]"
                      onClick={() => setModalParticipant(participant)}
                      type="button"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-stone-950">{participant.name}</h3>
                          <p className="text-sm text-stone-500">{participant.email}</p>
                          <p className="mt-1 text-xs text-stone-400">{participant.company} · {participant.ticketType}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          participant.present ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {participant.present ? 'Present' : 'Pending'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-stone-400">{formatTime(participant.checkedInAt)}</p>
                    </button>
                  ))
              )}
            </div>

            {/* ── Pagination ─────────────────────────────────────────────── */}
            {filteredParticipants.length > PAGE_SIZE && (
              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  type="button"
                >
                  ← Prev
                </button>

                <span className="text-xs text-stone-500">
                  Page {page} of {Math.ceil(filteredParticipants.length / PAGE_SIZE)}
                  <span className="ml-2 text-stone-400">
                    ({(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredParticipants.length)} of {filteredParticipants.length})
                  </span>
                </span>

                <button
                  className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={page >= Math.ceil(filteredParticipants.length / PAGE_SIZE)}
                  onClick={() => setPage((p) => p + 1)}
                  type="button"
                >
                  Next →
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
