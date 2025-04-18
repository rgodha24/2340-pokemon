# Pokemon

This is a project with a Django backend and React frontend.
The Django backend is just a simple Rest API for the frontend to use, and it's served at "/api" on the frontend directory.

## Project Structure
### Backend
The backend is a simple Django project with just one "app", called api.
This is setup like a normal django project, with api/urls.py containing the api route definitions, api/views.py containing the actual api code, and api/models.py containing the db setup.
Add database stuff to models.py and tell the user to run the migrate command. don't do it yourself.

### frontend
The frontend is a React project with shadcn/ui and tailwindcss. 
We use tanstack router as the router, and tanstack query for anything async. 
This means you should ALWAYS use useQuery for getting data from the backend, and useMutation for sending data to the backend.

The routes on the frontend are in the frontend/src/routes directory. 
If you plan on creating a new route, just tell me to create it.

"@" is an alias for the frontend/src directory. e.g. you can import from "@/components/ui/button" instead of "../components/ui/button"

ALWAYS add types to every fetch. the types live in the frontend/src/lib/types.ts file. Try to make these types as strict as possible (e.g. if there's a field that's only available if a boolean is true, use type narrowing so that the types display this too.)
