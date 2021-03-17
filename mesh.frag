#version 440
// ACESFitted https://github.com/TheRealMJP/BakingLab/blob/master/BakingLab/ACES.hlsl
out vec4 color;
in vec3 normal;
uniform vec3 lightvector = vec3(0, 1, 1);
uniform vec3 lightvector2 = vec3(0, 1, 0.25);
uniform vec3 lightvector3 = vec3(0.2, -1, .25);
// assume that colors are in srgb space already
uniform vec3 lightcolor1 = vec3(01.0, 1.0, 1.0);
uniform vec3 lightcolor2 = vec3(0.4, 0.35, 0.35);
uniform vec3 lightcolor3 = vec3(0.4, 0.3, 0.0);
uniform vec3 materialcolor = vec3(0.8, 0.8, 0.8);
uniform float hardness = 80.0;
uniform sampler2D env;
#define PI 3.1415926538
#define HPI 1.5707963269
vec2 normaltolonglat(vec3 normal)
{
    vec2 longlat;
    longlat.x = atan(normal.z, normal.x);
    longlat.y = asin(-normal.y);
    longlat = (longlat + HPI) / PI;
    return longlat;
}

vec3 light(vec3 normal, vec3 dir, vec3 lc)
{
    vec3 outcolor = vec3(0);
    vec3 n = normalize(normal);
    vec3 ndir = normalize(dir);
    float d = max(0, dot(n, ndir));
    float s = max(0, dot(n, normalize(ndir + vec3(0, 0, 1))));
    s = pow(s, hardness) * 0.5 ;
    outcolor = vec3(d) * pow(lc, vec3(2.2)) * pow(materialcolor, vec3(2.2));
    outcolor += vec3(s) * lc;
    return outcolor;
}

// Based on Filmic Tonemapping Operators http://filmicgames.com/archives/75
vec3 tonemapFilmic(const vec3 color)
{
    vec3 x = max(vec3(0.0), color - 0.004);
    return (x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06);
}

// https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
vec3 acesFilm(const vec3 x)
{
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT
const mat3 ACESInputMat =
{
    {0.59719, 0.07600, 0.02840},
    {0.35458, 0.90834, 0.13383},
    {0.04823, 0.01566, 0.83777}
};

// ODT_SAT => XYZ => D60_2_D65 => sRGB
const mat3 ACESOutputMat =
{
    { 1.60475, -0.10208, -0.00327},
    {-0.53108,  1.10813, -0.07276},
    {-0.07367, -0.00605,  1.07602}
};

vec3 RRTAndODTFit(vec3 v)
{
    vec3 a = v * (v + 0.0245786f) - 0.000090537f;
    vec3 b = v * (0.983729f * v + 0.4329510f) + 0.238081f;
    return a / b;
}

vec3 ACESFitted(vec3 color)
{
    //color = color * ACESInputMat;
    color =  ACESInputMat * color;
    // Apply RRT and ODT
    color = RRTAndODTFit(color);
    //color = color * ACESOutputMat ;
    color =  ACESOutputMat * color ;
    // Clamp to [0, 1]
    color = clamp(color, 0.0, 1.0);
    return color;
}

vec3 tonemapReinhard(const vec3 color)
{
    return color / (color + vec3(1.0));
}
vec3 LinearTosRGB(vec3 color)
{
    vec3 x = color * 12.92f;
    vec3 y = 1.055f * pow(clamp(color, 0.0, 1.0), vec3(1.0f / 2.4f)) - 0.055f;
    vec3 clr = color;
    clr.r = color.r < 0.0031308f ? x.r : y.r;
    clr.g = color.g < 0.0031308f ? x.g : y.g;
    clr.b = color.b < 0.0031308f ? x.b : y.b;
    return clr;
}
void main()
{
    vec3 outcolor = vec3(0);
    outcolor += light(normal, lightvector, lightcolor1);
    outcolor += light(normal + vec3(0, 0.5, 0), lightvector2, lightcolor2);
    outcolor += light(normal + vec3(0, -0.5, 0), lightvector3, lightcolor3);
    // convert to srgb
    color = vec4(outcolor, 1);
    //color = vec4(pow(outcolor, vec3(1 / 2.2)), 1);
    //color = vec4(acesFilm(outcolor), 1);
    //color = vec4(ACESFitted(pow(outcolor, vec3(1 / 2.2))), 1);
    color = vec4(LinearTosRGB(ACESFitted(outcolor)), 1);
}
