#version 440

layout(triangles) in;
layout(triangle_strip, max_vertices = 3) out;

in vec4 v_position[3];
in vec4 v_worldposition[3];
in vec3 v_worldnormal[3];

out vec4 position;
out vec3 normal;

void main()
{
    vec3 n = normalize(cross(v_worldposition[1].xyz - v_worldposition[0].xyz, v_worldposition[2].xyz - v_worldposition[0].xyz));

    for(int i = 0; i < gl_in.length(); i++)
    {
        gl_Position = gl_in[i].gl_Position;
        position = v_position[i];

        if(length(v_worldnormal[i]) > 0.5)
        {
            normal = v_worldnormal[i];
        }
        else
        {
            normal = n;
        }

        EmitVertex();
    }
}
