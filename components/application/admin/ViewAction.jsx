import React from "react";
import Link from "next/link";
import { FaRegEye } from "react-icons/fa";
import { MenuItem, ListItemIcon, ListItemText } from "@mui/material";

const ViewAction = ({ href }) => {
  return (
    <Link href={href} passHref>
      <MenuItem component="a" key="view">
        <ListItemIcon>
            <FaRegEye/>
        </ListItemIcon>
        <ListItemText primary="View" />
      </MenuItem>
    </Link>
  );
};

export default ViewAction;
