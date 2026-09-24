import { Fragment } from "react";
import { splitLinks } from "./linkify";
import { formatMessageTime } from "./threadMessages";

const bubbleClass = (message) => {
  if (message.own) return "bg-brand-600 text-white rounded-tr-sm";
  if (message.fromStaff) return "bg-gray-100 text-gray-700 dark:bg-night-800 dark:text-night-200 rounded-tl-sm";
  return "bg-white border border-gray-200 text-gray-700 dark:bg-night-900 dark:border-night-700 dark:text-night-200 rounded-tl-sm";
};

const PortalMessageBubble = ({ message, onRetry }) => {
  const { own, fromStaff, authorName, content, created_at: createdAt, status } = message;

  return (
    <div
      data-own={own ? "true" : "false"}
      className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${own ? "ml-auto items-end" : "items-start"}`}
    >
      {authorName && (
        <p className='text-xs font-semibold text-gray-500 dark:text-night-400 mb-1 px-1'>
          {authorName}
          {fromStaff && <span className='font-normal'> · Equipo de soporte</span>}
        </p>
      )}
      <div
        className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap wrap-break-word ${bubbleClass(message)} ${
          status === "failed" ? "opacity-70" : ""
        }`}
      >
        {splitLinks(content).map((part, index) =>
          part.type === "link" ? (
            <a
              key={index}
              href={part.href}
              target='_blank'
              rel='noopener noreferrer'
              className={own ? "underline text-white" : "underline text-brand-700 dark:text-brand-300"}
            >
              {part.value}
            </a>
          ) : (
            <Fragment key={index}>{part.value}</Fragment>
          )
        )}
      </div>
      <div className='text-[11px] text-gray-400 dark:text-night-500 mt-1 px-1'>
        {status === "sending" && <span>Enviando…</span>}
        {status === "failed" && (
          <span role='alert' className='text-red-600 dark:text-red-400'>
            No se envió.{" "}
            <button type='button' onClick={onRetry} className='font-semibold underline'>
              Reintentar
            </button>
          </span>
        )}
        {status === "sent" && createdAt && <time dateTime={createdAt}>{formatMessageTime(createdAt)}</time>}
      </div>
    </div>
  );
};

export default PortalMessageBubble;
