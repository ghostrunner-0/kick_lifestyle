import React from "react";
import Link from "next/link";
import { EditIcon } from "lucide-react";
import { MenuItem, ListItemIcon, ListItemText } from "@mui/material";

const EditAction = ({ href }) => {
  return (
    <Link href={href} passHref legacyBehavior>
      <MenuItem component="a" key="edit">
        <ListItemIcon>
          <EditIcon />
        </ListItemIcon>
        <ListItemText primary="Edit" />
      </MenuItem>
    </Link>
  );
};

export default EditAction;
