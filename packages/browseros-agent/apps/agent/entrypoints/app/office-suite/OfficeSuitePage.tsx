import type { FC } from 'react'
import { OfficeSuiteEditor } from './OfficeSuiteEditor'
import { OfficeSuiteHeader } from './OfficeSuiteHeader'

/** @public */
export const OfficeSuitePage: FC = () => {
  return (
    <div className="fade-in slide-in-from-bottom-5 animate-in space-y-6 duration-500">
      <OfficeSuiteHeader />
      <OfficeSuiteEditor />
    </div>
  )
}
