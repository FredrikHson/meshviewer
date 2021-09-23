#version 440

layout(triangles) in;
layout(triangle_strip, max_vertices = 6) out;

in vec4 v_position[3];
in vec4 v_worldposition[3];
in vec3 v_worldnormal[3];

out vec4 position;
out vec3 vcolor;
out vec3 normal;
uniform bool calculatenormals = false;
uniform bool doublesided = false;
uniform vec3 materialcolor = vec3(0.8, 0.8, 0.8);

void newvert(int index, vec3 n, float backside)
{
    gl_Position = gl_in[index].gl_Position;
    position = v_position[index];

    if(backside < 0)
    {
        vcolor = 1 - materialcolor;
    }
    else
    {
        vcolor = materialcolor;
    }

    if(!calculatenormals)
    {
        normal = v_worldnormal[index] * vec3(backside);
    }
    else
    {
        normal = n;
    }

    EmitVertex();
}

void main()
{
    vec3 n;

    if(calculatenormals)
    {
        n = normalize(cross(v_worldposition[1].xyz - v_worldposition[0].xyz, v_worldposition[2].xyz - v_worldposition[0].xyz));
    }

    newvert(0, n, 1);
    newvert(1, n, 1);
    newvert(2, n, 1);
    EndPrimitive();

    if(doublesided)
    {
        newvert(0, -n, -1);
        newvert(2, -n, -1);
        newvert(1, -n, -1);
        EndPrimitive();
    }
}
