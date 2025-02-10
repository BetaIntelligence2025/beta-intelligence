import { Fragment } from 'react'

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface BreadcrumbUnit {
  href?: string
  title?: string
  hasSeparator?: boolean
  isCurrentPage?: boolean
  isEllipsis?: boolean
}

interface PageHeaderProps {
  pageTitle: string
  breadcrumbs?: BreadcrumbUnit[]
}

// Page Title + Page Breadcrumbs
export function PageHeader({ pageTitle, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-lg font-medium tracking-tight lg:text-xl xl:text-2xl">
        {pageTitle}
      </h1>

      {breadcrumbs && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item) => {
              return (
                <Fragment key={item.title}>
                  <BreadcrumbItem>
                    {item.isEllipsis && <BreadcrumbEllipsis />}

                    {item.isCurrentPage ? (
                      <BreadcrumbPage>{item.title}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={item.href}>
                        {item.title}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>

                  {item.hasSeparator && <BreadcrumbSeparator />}
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
    </div>
  )
}
