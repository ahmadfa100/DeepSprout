export type PracticeType = 'depth'|'listening'|'practical'|'protected-work';
export interface ActivityReference {activityId:string;activityVersion:number;contentVersion:string;definitionSnapshot:Record<string,unknown>;}
/** Frontend demo domain contracts. These are not a production API schema. */
export type Workspace = 'mentor' | 'student' | 'organization' | 'provider' | 'supervisor' | 'admin' | 'participant';
export type ApplicationStatus = 'Draft' | 'Submitted' | 'Pending Verification' | 'Needs More Info' | 'Approved' | 'Rejected' | 'Suspended';
export type SubmissionStatus = 'Submitted' | 'Approved' | 'Needs Revision' | 'Rejected';
export type BookingStatus = 'Pending Approval' | 'Confirmed' | 'Waitlisted' | 'Seat Offered' | 'Checked In' | 'Completed' | 'Cancelled' | 'Rejected' | 'Offer Expired' | 'Declined';
export interface Person { id: string; name: string; email: string; workspaces: Workspace[]; status: 'Active' | 'Suspended'; verified: boolean; individualHandoff?: boolean; }
export interface Group { id: string; ownerId: string; name: string; purpose: string; description: string; capacity: number; enrollment: string; approval: boolean; status: string; created: string; memberIds: string[]; programId: string | null; }
export interface Stage { id: string; title: string; objective: string; date: string; }
export interface Program { activityDefinitions?: {title:string;reference:ActivityReference}[]; id: string; ownerId: string; title: string; description: string; purpose: string; focus: string; duration: number; groupIds: string[]; start: string; end: string; status: string; version: number; stages: Stage[]; activities: string[]; required: boolean; review: string; history: unknown[]; }
export interface Submission {activityReference?:Record<string,unknown>|null;instructionsSnapshot?:string; id: string; assignmentId: string; studentId: string; text: string; file: string; status: SubmissionStatus; submitted: string; feedback: string; history: unknown[]; }
export interface Booking { id: string; experienceId: string; personId: string; status: BookingStatus; created: string; credential: string; eligible: boolean; }
export interface Application { id: string; personId: string; type: 'mentor' | 'organization' | 'provider'; name: string; email: string; status: ApplicationStatus; submitted: string | null; updated: string; details: Record<string,string|boolean>; files: string[]; messages: {actorId:string;text:string;created:string}[]; }
export interface FormQuestion { id: string; label: string; type: 'Short text' | 'Long text' | 'Single choice' | 'Multiple choice' | 'Rating' | 'Number' | 'Date' | 'File preview'; required: boolean; options: string[]; }
export interface Attendance { id:string; experienceId:string; sessionId:string; personId:string; status:'Present'|'Corrected'; method:string; reason:string; actorId:string; created:string; }
export interface AuditEntry { id:string; actorId:string; action:string; resource:string; reason:string; result:string; created:string; }
export interface Invitation { id:string; groupId:string; token:string; email:string; expires:string; limit:number; uses:number; status:'Active'|'Revoked'; }
export interface Assignment extends Partial<ActivityReference> { id:string; ownerId:string; groupId:string; programId?:string; stageId?:string; studentId?:string|null; title:string; activity:string; instructions:string; evidence:string; due:string; required:boolean; review:string; status:'Active'|'Cancelled'; }
export interface GardenMemory { id:string; sourceId:string; personId:string; groupId:string; label:string; source:string; created:string; }
export interface MentorMembership { id:string; groupId:string; personId:string; status:'Pending'|'Approved'; }
export interface MentorshipData { groups:Group[]; invitations:Invitation[]; programs:Program[]; assignments:Assignment[]; submissions:Submission[]; memberships:MentorMembership[]; rewards:GardenMemory[]; }
export interface InitiativeComponent { id:string; type:'Awareness Content'|'Session'|'Survey or Quiz'|'Competition'|'Mentor Program'|'Linked Outdoor Experience'; title:string; resourceId?:string; description?:string; date?:string; format?:string; }
export interface FormDefinition { id:string; ownerId?:string; title:string; purpose:string; initiativeId:string; anonymous:boolean; status:'Draft'|'Published'|'Closed'; version:number; questions:FormQuestion[]; versions:{version:number;questions:FormQuestion[];created:string}[]; }
export interface FormResponse { id:string; formId:string; version:number; personId:string|null; submitted:string; answers:Record<string,string|string[]>; }
export interface SeatOffer { id:string; bookingId:string; experienceId:string; personId:string; status:'Offered'|'Accepted'|'Declined'|'Expired'|'Cancelled'; created:string; expires:string; }
export interface SupervisorAppointment { id:string; experienceId:string; personId:string; sessionIds:string[]; scope:string; cohortPermission:boolean; status:'Invited'|'Accepted'|'Declined'|'Revoked'; }
export interface Cohort { id:string; experienceId:string; supervisorId:string; name:string; description:string; capacity:number; memberIds:string[]; status:'Active'|'Archived'; token:string; }
export interface ExperienceSession { id:string; experienceId:string; title:string; date:string; time:string; endTime:string; venue:string; description:string; criteria:string; }
