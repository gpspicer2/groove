import React, { forwardRef } from 'react';
import {
  Activity as RawActivity, Calendar as RawCalendar, Camera as RawCamera, Check as RawCheck, ChevronDown as RawChevronDown, ChevronLeft as RawChevronLeft, ChevronRight as RawChevronRight, ChevronUp as RawChevronUp, Dumbbell as RawDumbbell, ExternalLink as RawExternalLink, Footprints as RawFootprints, GripVertical as RawGripVertical, Heart as RawHeart, Info as RawInfo, Link2 as RawLink2, Lock as RawLock, LogOut as RawLogOut, MessageCircle as RawMessageCircle, Minus as RawMinus, Pencil as RawPencil, Play as RawPlay, Plus as RawPlus, Replace as RawReplace, RotateCcw as RawRotateCcw, Search as RawSearch, Send as RawSend, SlidersHorizontal as RawSlidersHorizontal, Square as RawSquare, StretchHorizontal as RawStretchHorizontal, Timer as RawTimer, Trash2 as RawTrash2, User as RawUser, Wind as RawWind, X as RawX, Repeat as RawRepeat, LayoutDashboard as RawLayoutDashboard, Users as RawUsers, BookOpen as RawBookOpen, CreditCard as RawCreditCard, AlertTriangle as RawAlertTriangle, StickyNote as RawStickyNote, CheckCircle2 as RawCheckCircle2, Sparkles as RawSparkles
} from 'lucide-react';

// Lucide draws icons with SVG attributes, which can't use the theme's CSS
// variables (the colors that switch for dark mode). This wraps each icon so
// color / fill / stroke go through `style`, where variables work.
function themed(Icon) {
  return forwardRef(function ThemedIcon({ color, fill, stroke, style, ...rest }, ref) {
    const css = { ...style };
    if (color) css.color = color;
    if (fill) css.fill = fill;
    if (stroke) css.stroke = stroke;
    return <Icon ref={ref} {...rest} style={css} />;
  });
}

export const Activity = themed(RawActivity);
export const Calendar = themed(RawCalendar);
export const Camera = themed(RawCamera);
export const Check = themed(RawCheck);
export const ChevronDown = themed(RawChevronDown);
export const ChevronLeft = themed(RawChevronLeft);
export const ChevronRight = themed(RawChevronRight);
export const ChevronUp = themed(RawChevronUp);
export const Dumbbell = themed(RawDumbbell);
export const ExternalLink = themed(RawExternalLink);
export const Footprints = themed(RawFootprints);
export const GripVertical = themed(RawGripVertical);
export const Heart = themed(RawHeart);
export const Info = themed(RawInfo);
export const Link2 = themed(RawLink2);
export const Lock = themed(RawLock);
export const LogOut = themed(RawLogOut);
export const MessageCircle = themed(RawMessageCircle);
export const Minus = themed(RawMinus);
export const Pencil = themed(RawPencil);
export const Play = themed(RawPlay);
export const Plus = themed(RawPlus);
export const Replace = themed(RawReplace);
export const RotateCcw = themed(RawRotateCcw);
export const Search = themed(RawSearch);
export const Send = themed(RawSend);
export const SlidersHorizontal = themed(RawSlidersHorizontal);
export const Square = themed(RawSquare);
export const StretchHorizontal = themed(RawStretchHorizontal);
export const Timer = themed(RawTimer);
export const Trash2 = themed(RawTrash2);
export const User = themed(RawUser);
export const Wind = themed(RawWind);
export const X = themed(RawX);
export const Repeat = themed(RawRepeat);
export const LayoutDashboard = themed(RawLayoutDashboard);
export const Users = themed(RawUsers);
export const BookOpen = themed(RawBookOpen);
export const CreditCard = themed(RawCreditCard);
export const AlertTriangle = themed(RawAlertTriangle);
export const StickyNote = themed(RawStickyNote);
export const CheckCircle2 = themed(RawCheckCircle2);
export const Sparkles = themed(RawSparkles);
