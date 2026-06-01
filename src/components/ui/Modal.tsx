import { Fragment, type ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Button from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

export default function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        {/* Container com scroll */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 sm:pt-8 sm:pb-8">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full ${sizes[size]} rounded-2xl bg-white dark:bg-slate-900
                  shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden
                  flex flex-col max-h-[90vh]`}
              >
                {/* Header — fixo */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
                  <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {title}
                  </Dialog.Title>
                  <button onClick={onClose}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Body — scrollável */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {children}
                </div>

                {/* Footer — fixo */}
                {footer && (
                  <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export { Button }
