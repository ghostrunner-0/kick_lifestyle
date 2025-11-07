import { NextResponse } from "next/server";

export const response = (success, statusCode, message, data = {}) => {
  return NextResponse.json({
    success,
    statusCode,
    message,
    data,
  });
};

export const catchError = (error, customMessage) => {
  if (error.code === 11000) {
    const keys = Object.keys(error.keyPattern).join(", ");
    error.message = `Duplicate key Fields: ${keys} already exists.`;
  }
  let errorObj = {};
  if (process.env.NODE_ENV === "development") {
    errorObj = {
      message: error.message,
      error,
    };
  } else {
    errorObj = {
      message: customMessage || "Internal Server Error",
    };
  }
  return NextResponse.json({
    success: false,
    statusCode: error.code,
    ...errorObj,
  });
};
export const generateotp = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
};

const SECRET_KEY = process.env.SECRET_KEY;

export const columnConfig = (
  column = [], // Default to empty array if column is undefined
  isCreatedAt = false,
  isUpdatedAt = false,
  isDeletedAt = false
) => {
  const newColumn = [...column]; // Ensure it's always an array

  // Date helper function to handle invalid dates
  const formatDate = (renderedCellValue) => {
    const date = new Date(renderedCellValue);
    if (isNaN(date)) return "Invalid date"; // Fallback if the date is invalid
    return date.toLocaleString(); // Format the date to local string
  };

  // Add createdAt column if required
  if (isCreatedAt) {
    newColumn.push({
      accessorKey: "createdAt",
      header: "Created At",
      Cell: ({ renderedCellValue }) => formatDate(renderedCellValue),
    });
  }

  // Add updatedAt column if required
  if (isUpdatedAt) {
    newColumn.push({
      accessorKey: "updatedAt",
      header: "Updated At",
      Cell: ({ renderedCellValue }) => formatDate(renderedCellValue),
    });
  }

  // Add deletedAt column if required
  if (isDeletedAt) {
    newColumn.push({
      accessorKey: "deletedAt",
      header: "Deleted At",
      Cell: ({ renderedCellValue }) => formatDate(renderedCellValue),
    });
  }

  return newColumn;
};
