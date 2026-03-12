"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="mb-6 text-6xl text-gray-400" aria-hidden="true">
          &#x1F4F6;
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">You are offline</h1>
        <p className="mb-6 text-gray-600">Please check your internet connection and try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
