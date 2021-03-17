print("initing");
RAD = 0.0174532925199;
filename = getoptionalstring("file", "");

shadowbuffer = createrendertarget(1024, 1024, 1, GL_RGBA, GL_RGBA32F, 0);

if(filename == "")
{
    mesh = generateplane(10, 10, 1, 1);
}
else
{
    mesh = loadmesh(filename);
}

//re = new RegExp("/(?:\.([^.]+))?$/","i");
ext = filename.substr(filename.lastIndexOf('.') + 1);

bbox = getmeshbbox(mesh);
meshshader = loadshader("mesh.vert", "mesh.frag", "mesh.geom", 0, 0);
shadowbufshader = loadshader("shadowbuf.vert", "shadowbuf.frag", 0, 0, 0);
wireframeshader = loadshader("mesh.vert", "wireframe.frag", 0, 0, 0);
blit = loadshader("blit.vert", "blit.frag", 0, 0, 0);

plane = generateplane(50);

clearcolor = [ 0, 0, 0, 0 ];
matcolor = [1, 1, 1];
angle = [45, 22.5];
lightdir = [0, 0];
zoom = 0;

function readconfigvalue(configname, defvalue)
{
    if(config == undefined)
    {
        return defvalue;
    }

    if(config.defaults != undefined)
    {
        if(config.defaults.matcolor != undefined)
        {
            finalvalue = config.defaults[configname];
        }
    }

    if(config[ext][configname] != undefined)
    {
        finalvalue = config[ext][configname];
    }

    if(finalvalue != undefined)
    {
        return finalvalue;
    }
    else
    {
        return defvalue;
    }
}

function loadconfig()
{
    try
    {
        jsonstring = File.read("confige.json");
        config = JSON.parse(jsonstring);
        jsonstring = 0;
        matcolor = readconfigvalue("matcolor", [1, 1, 1]);
        angle = readconfigvalue("angle", [45, -22.5]);
        angle[0] *= RAD;
        angle[1] *= RAD;
        lightdir = readconfigvalue("lightangle", [0, 0]);
        zoom = readconfigvalue("zoom", -2);
        clearcolor = readconfigvalue("clear", [0, 0, 0, 1]);
    }
    catch(error)
    {
    }

    print(config);
}

loadconfig();

posx = 0;
posy = 0;

center =
{
x:
    (bbox.max_x + bbox.min_x) / 2.0,
y:
    (bbox.max_y + bbox.min_y) / 2.0,
z:
    (bbox.max_z + bbox.min_z) / 2.0
};
xdist = bbox.max_x - bbox.min_x;
ydist = bbox.max_y - bbox.min_y;
zdist = bbox.max_z - bbox.min_z;
largestdist = xdist;

if(ydist > largestdist)
{
    largestdist = ydist;
}

if(zdist > largestdist)
{
    largestdist = zdist;
}

print(bbox);
print(center);
up = 3;
step = 0;

function handleinput()
{
    if(KEY_R & PRESSED_NOW)
    {
        loadconfig();
    }

    if(KEY_F & PRESSED_NOW)
    {
        posx = 0;
        posy = 0;
        zoom = -1.5;
    }

    if((KEY_LEFT_SHIFT & PRESSED || KEY_RIGHT_SHIFT & PRESSED))
    {
        if(MOUSE_INSIDE)
        {
            if(MOUSE_1 & PRESSED)
            {
                lightdir[0] -= MOUSE_DELTA_X * 0.01;
                lightdir[1] -= MOUSE_DELTA_Y * 0.01;
            }
        }

        if(KEY_Z & PRESSED)
        {
            up = 6;
        }

        if(KEY_Y & PRESSED)
        {
            up = 5;
        }

        if(KEY_X & PRESSED)
        {
            up = 4;
        }
    }
    else
    {
        if(MOUSE_INSIDE)
        {
            if(MOUSE_1 & PRESSED)
            {
                angle[0] += MOUSE_DELTA_X * 0.01;
                angle[1] += MOUSE_DELTA_Y * 0.01;
            }
        }

        if(KEY_Z & PRESSED)
        {
            up = 3;
        }

        if(KEY_Y & PRESSED)
        {
            up = 2;
        }

        if(KEY_X & PRESSED)
        {
            up = 1;
        }

        if(MOUSE_3 & PRESSED)
        {
            posx -= MOUSE_DELTA_X * 0.004;
            posy += MOUSE_DELTA_Y * 0.004;
        }

        if(MOUSE_2 & PRESSED)
        {
            zoom += MOUSE_DELTA_Y * 0.01;
        }
    }
}

function loop()
{
    handleinput();
    lightvector = {x: 0, y: 0, z: 1};
    model = mat4loadidentity();
    model = mat4mul(model, mat4settranslation(-center.x, -center.y, -center.z));
    model = mat4mul(model, mat4setscale(1 / largestdist));

    switch(up)
    {
        case 3:
            model = mat4mul(model, mat4setrotation(1.5708, 1, 0, 0));
            break;

        case 6:
            model = mat4mul(model, mat4setrotation(1.5708, -1, 0, 0));
            break;

        case 1:
            model = mat4mul(model, mat4setrotation(1.5708, 0, 0, -1));
            break;

        case 4:
            model = mat4mul(model, mat4setrotation(1.5708, 0, 0, 1));
            break;

        case 5:
            model = mat4mul(model, mat4setrotation(1.5708 * 2, 1, 0, 0));
            break;
    }

    model = mat4mul(model, mat4setrotation(angle[0], 0, 1, 0));
    model = mat4mul(model, mat4setrotation(angle[1], 1, 0, 0));
    shadowmat = model;
    shadowmat = mat4mul(shadowmat, mat4setrotation(lightdir[0], 0, 1, 0));
    shadowmat = mat4mul(shadowmat, mat4setrotation(lightdir[1], 1, 0, 0));
    lightmat = mat4loadidentity();
    lightmat  = mat4mul(lightmat, mat4setrotation(lightdir[0], 0, 1, 0));
    lightmat  = mat4mul(lightmat, mat4setrotation(lightdir[1], 1, 0, 0));
    lightvector = vec3mat4mul(lightvector, mat4invert((lightmat)));
    beginpass(shadowbuffer);
    {
        wireframe(0);
        depthtest(1);
        culling(CULL_NONE);
        clear(0, 0, 0, 1);
        cleardepth();
        view = mat4settranslation(0, 0, -2.0);
        persp = mat4setperspective(0.785398, 1, 0.1, 1000.0);
        bindshader(shadowbufshader);
        bindattribute("in_Position", MESH_FLAG_POSITION);
        bindattribute("in_Normals", MESH_FLAG_NORMAL);
        setuniformmat4("modelview", mat4mul(shadowmat, view));
        setuniformmat4("persp", persp);
        drawmesh(mesh);
        bindshader(-1);
    }
    endpass();

    if(KEY_W & PRESSED)
    {
        wireframe(1);
    }

    beginpass();
    {
        depthtest(1);
        culling(CULL_NONE);
        clear(clearcolor[0], clearcolor[1], clearcolor[2], clearcolor[3]);
        cleardepth();
        view = mat4settranslation(posx, posy, zoom);
        persp = mat4setperspective(0.785398, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 1000.0);
        bindshader(meshshader);
        bindattribute("in_Position", MESH_FLAG_POSITION);
        bindattribute("in_Normals", MESH_FLAG_NORMAL);
        setuniformmat4("modelview", mat4mul(model, view));
        setuniformmat4("shadowmodelview", mat4mul(shadowmat, view));
        setuniformmat4("persp", persp);
        setuniformf("lightvector", lightvector.x, lightvector.y, lightvector.z);
        setuniformf("materialcolor", matcolor[0], matcolor[1], matcolor[2]);
        drawmesh(mesh);
        bindshader(-1);
    }
    endpass();
    wireframe(0);

    if(KEY_D & PRESSED)
    {
        debugmode(DEBUG_RENDERALLSTEPS);
        debugclip(1);
    }
    else
    {
        debugmode(DEBUG_OFF);
    }

    if(KEY_Q & PRESSED)
    {
        exit();
    }

    //debugrange(-10,100);
    //debugrange(-0.010,0.01);
}
