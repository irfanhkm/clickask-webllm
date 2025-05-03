import React from 'react';
import { Link, useRouteError } from 'react-router-dom';

const ErrorPage: React.FC = () => {
  const error: any = useRouteError();
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
      <h1 className="text-3xl font-bold mb-2">{error?.status === 404 ? '404 - Not Found' : 'Unexpected Application Error!'}</h1>
      <p className="mb-4 text-gray-600">
        {error?.status === 404
          ? 'Sorry, the page you are looking for does not exist.'
          : error?.statusText || error?.message || 'Something went wrong.'}
      </p>
      <Link to="/chats" className="text-blue-600 underline">Go to Home</Link>
    </div>
  );
};

export default ErrorPage; 