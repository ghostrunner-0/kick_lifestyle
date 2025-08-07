import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
const BreadCrumb = ({ BreadCrumbData }) => {
  return (
    <Breadcrumb className="mb-5">
      <BreadcrumbList>
        {BreadCrumbData.length > 0 &&
          BreadCrumbData.map((data, index) => {
            return index !== BreadCrumbData.length - 1 ? (
              <div key={index} className="flex items-center">
                <BreadcrumbItem>
                  <BreadcrumbLink href={data.href}>{data.label}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className={"ms-2 mt-0.5"}/>
              </div>
            ) : (
              <div key={index} className="flex items-center">
                <BreadcrumbItem>
                  <BreadcrumbLink className={"font-semibold"} href={data.href}>{data.label}</BreadcrumbLink>
                </BreadcrumbItem>
                {/* <BreadcrumbSeparator /> */}
              </div>
            );
          })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default BreadCrumb;
